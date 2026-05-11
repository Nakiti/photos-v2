import { useAuthStore } from '../stores/auth.store';
import * as authService from '../services/api/auth.service';
import * as Keychain from 'react-native-keychain';
import apiClient from '../services/apiClient';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { syncCurrentUser } from '../services/sync/user.sync';
import { useDatabase } from '@nozbe/watermelondb/react';
import { getMyProfile, addDeviceToken, removeDeviceToken } from '../services/api/userService';
import User from '../db/models/User';
import { AxiosError } from 'axios';
import { socket } from '../services/socketClient';
import { Platform } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import { useDeepLinkStore } from '../stores/deepLink.store';
import { navigateParsedLink } from './useDeepLinks';

export async function registerPushToken() {
  try {
    const authStatus = await messaging().requestPermission();
    const granted =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;
    if (!granted) return;

    const token = await messaging().getToken();
    await addDeviceToken({
      token,
      platform: Platform.OS as 'ios' | 'android',
    });
  } catch {
    // Push registration is best-effort — never block the auth flow
  }
}

function processPendingDeepLink() {
  const { pendingLink, clearPendingLink } = useDeepLinkStore.getState();
  if (!pendingLink) return;
  clearPendingLink();
  setTimeout(() => navigateParsedLink(pendingLink), 300);
}

// This hook provides an easy-to-use interface for authentication logic
export const useAuth = () => {
    const { user, token, isAuthenticated, setUser, setToken, logout: storeLogout } = useAuthStore();
    const queryClient = useQueryClient();
    const database = useDatabase()
  
    // --- MUTATION FOR REGISTRATION ---
    const { mutateAsync: register, isPending: isRegistering } = useMutation({
      mutationFn: authService.register,
      onSuccess: async (data) => {
        const { user: newUser, token: newToken, refreshToken } = data;
        await Keychain.setGenericPassword('userToken', newToken);
        await Keychain.setGenericPassword('refresh', refreshToken, { service: 'focal_refresh_token' });
        apiClient.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
        const userProfile = await getMyProfile();
        setUser(userProfile);
        setToken(newToken);
        await syncCurrentUser(database, userProfile);
        await Keychain.setGenericPassword('user', userProfile.id, { service: 'focal_user_id' });
        if (!socket.connected) {
          socket.connect();
          console.log('[Auth] Socket connection initiated after registration');
        }
        registerPushToken();
        processPendingDeepLink();
      },
      onError: (error) => {
        console.error('Registration failed:', error);
        // You can add global error handling here
      },
    });
  
    // --- MUTATION FOR LOGIN ---
    const { mutateAsync: login, isPending: isLoggingIn } = useMutation({
      mutationFn: authService.login,
      onSuccess: async (data) => {
        const { user: loggedInUser, token: newToken, refreshToken } = data;
        await Keychain.setGenericPassword('userToken', newToken);
        await Keychain.setGenericPassword('refresh', refreshToken, { service: 'focal_refresh_token' });
        apiClient.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
        const userProfile = await getMyProfile();
        setUser(userProfile);
        setToken(newToken);
        await syncCurrentUser(database, userProfile);
        await Keychain.setGenericPassword('user', userProfile.id, { service: 'focal_user_id' });
        if (!socket.connected) {
          socket.connect();
          console.log('[Auth] Socket connection initiated after login');
        }
        registerPushToken();
        processPendingDeepLink();
      },
      onError: (error) => {
        console.error('Login failed:', error);
      },
    });
  
    const logout = async () => {
      try {
        // Revoke refresh token on the server so it can't be used to obtain new access tokens
        try {
          const refreshCreds = await Keychain.getGenericPassword({ service: 'focal_refresh_token' });
          if (refreshCreds) {
            await authService.logout(refreshCreds.password);
          }
        } catch {
          // Best-effort — don't block logout if server is unreachable
        }

        // Remove FCM device token so push notifications stop immediately
        try {
          const fcmToken = await messaging().getToken();
          await removeDeviceToken(fcmToken);
          await messaging().deleteToken();
        } catch {
          // Best-effort
        }

        if (socket.connected) {
          socket.disconnect();
          console.log('[Auth] Socket disconnected on logout');
        }

        await Promise.all([
          Keychain.resetGenericPassword(),
          Keychain.resetGenericPassword({ service: 'focal_user_id' }),
          Keychain.resetGenericPassword({ service: 'focal_refresh_token' }),
        ]);
        delete apiClient.defaults.headers.common['Authorization'];
        storeLogout();
        queryClient.clear();
        await database.unsafeResetDatabase();
      } catch (error) {
        console.error('Logout failed:', error);
      }
    };
  
    const checkAuthStatus = async () => {
      console.log('[Auth] Starting checkAuthStatus...');
      try {
        const credentials = await Keychain.getGenericPassword();
        if (credentials) {
          console.log('[Auth] Credentials found in Keychain');
          const storedToken = credentials.password;
          apiClient.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
          setToken(storedToken);
          // --- 1. LOCAL FIRST STRATEGY ---
          // Try to load user from local DB immediately so we don't block the UI
          let foundLocalUser = false;
          try {
             console.log('[Auth] Attempting to load user from local DB...');
             // Read the persisted user ID so we restore the exact right user record,
             // not just whatever happens to be first in the table.
             const userIdCreds = await Keychain.getGenericPassword({ service: 'focal_user_id' });
             const storedUserId = userIdCreds ? userIdCreds.password : null;

             const usersCollection = database.collections.get<User>('users');
             let localUser: User | null = null;

             if (storedUserId) {
               try {
                 localUser = await usersCollection.find(storedUserId);
               } catch {
                 // Record not found — fall through to null
               }
             }

             // Fallback for existing installs that don't have the stored ID yet
             if (!localUser) {
               const allUsers = await usersCollection.query().fetch();
               if (allUsers.length > 0) localUser = allUsers[0];
             }

             if (localUser) {
                 const localUserProfile = {
                    id: localUser.id,
                    name: localUser.name,
                    handle: localUser.handle,
                    avatarUrl: localUser.avatarUrl,
                    email: localUser.email,
                  };
                  setUser(localUserProfile as any);
                  foundLocalUser = true;
                  console.log('[Auth] Optimistically restored user from local DB:', localUserProfile.id);
             } else {
                 console.log('[Auth] No user found in local DB');
             }
          } catch (e) {
             console.warn('[Auth] Failed to load local user', e);
          }

          // --- 2. REMOTE VERIFICATION FUNCTION ---
          const verifyAndSyncWithServer = async () => {
            try {
              console.log('[Auth] Verifying session with server...');
              const userProfile = await getMyProfile();
              setUser(userProfile);
              await syncCurrentUser(database, userProfile);
              console.log('[Auth] Server verification success');

              if (!socket.connected) {
                socket.connect();
                console.log('[Auth] Socket connection initiated on app load');
              }
              registerPushToken();
            } catch (error) {
              // 401s are handled by the apiClient interceptor, which automatically
              // attempts a token refresh and logs out if the refresh fails.
              // Any error reaching here is a non-auth failure (network down, server error).
              const axiosError = error as AxiosError;
              if (axiosError.response?.status !== 401) {
                console.warn('[Auth] Background sync failed (likely offline). User stays logged in.', error);
              }
            }
          };

          // --- 3. DECISION: BLOCKING OR BACKGROUND? ---
          if (foundLocalUser) {
             // CRITICAL FIX: If we found a local user, let the app open IMMEDIATELY.
             // Do not await the network call. Run it in the background.
             console.log('[Auth] Local user found, verifying in background');
             verifyAndSyncWithServer(); 
          } else {
             // If we have a token but NO local user (fresh install or wiped data),
             // we MUST await the network to know who the user is.
             console.log('[Auth] No local user, awaiting server verification');
             await verifyAndSyncWithServer();
          }
        } else {
          console.log('[Auth] No credentials found in Keychain');
        }
      } catch (error) {
        // Keychain error - this is a critical error, but we shouldn't log out
        // if we already have a token in memory
        console.error('Keychain access failed:', error);
        // Only log out if we don't have a token in memory
        if (!token) {
          await logout();
        }
      }
      console.log('[Auth] checkAuthStatus complete');
    };
  
    return {
      user,
      token,
      isAuthenticated,
      register, // The async function to call
      isRegistering, // The loading state for the register button
      login, // The async function to call
      isLoggingIn, // The loading state for the login button
      logout,
      checkAuthStatus,
    };
  };