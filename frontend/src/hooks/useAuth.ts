import { useAuthStore } from '../stores/auth.store';
import * as authService from '../services/api/auth.service';
import * as Keychain from 'react-native-keychain';
import apiClient from '../services/apiClient';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { syncCurrentUser } from '../services/sync/user.sync';
import { useDatabase } from '@nozbe/watermelondb/react';
import { getMyProfile } from '../services/api/userService';
import User from '../db/models/User';
import { AxiosError } from 'axios';

// This hook provides an easy-to-use interface for authentication logic
export const useAuth = () => {
    const { user, token, isAuthenticated, setUser, setToken, logout: storeLogout } = useAuthStore();
    const queryClient = useQueryClient();
    const database = useDatabase()
  
    // --- MUTATION FOR REGISTRATION ---
    const { mutateAsync: register, isPending: isRegistering } = useMutation({
      mutationFn: authService.register,
      onSuccess: async (data) => {
        const { user: newUser, token: newToken } = data;
        // 1. Store the token securely
        await Keychain.setGenericPassword('userToken', newToken);
        // 2. Update the API client header
        apiClient.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
        // 3. Update the global state
        setUser(newUser);
        setToken(newToken);
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
        const { user: loggedInUser, token: newToken } = data;
        await Keychain.setGenericPassword('userToken', newToken);
        apiClient.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
        setUser(loggedInUser);
        setToken(newToken);

        await syncCurrentUser(database, loggedInUser)
      },
      onError: (error) => {
        console.error('Login failed:', error);
      },
    });
  
    const logout = async () => {
      try {
        await Keychain.resetGenericPassword();
        delete apiClient.defaults.headers.common['Authorization'];
        storeLogout();
        // Invalidate all queries to clear cached data upon logout
        queryClient.clear();
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
             const usersCollection = database.collections.get<User>('users');
             // Since we might not have the ID yet, grab the first user (assuming single-user device context)
             // or matching ID if we had it persisted elsewhere
             const allUsers = await usersCollection.query().fetch();
             
             if (allUsers.length > 0) {
                 const localUser = allUsers[0];
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
          // We define this separately so we can choose whether to await it or not
          const verifyAndSyncWithServer = async () => {
            try {
              console.log('[Auth] Verifying session with server...');
              const userProfile = await getMyProfile();
              setUser(userProfile);
              await syncCurrentUser(database, userProfile);
              console.log('[Auth] Server verification success');
            } catch (error) {
              const axiosError = error as AxiosError;
              const isAuthError = axiosError.response?.status === 401;

              if (isAuthError) {
                // Token is invalid/expired - log the user out
                console.error('[Auth] Token expired (401), logging out');
                await logout();
              } else {
                // Network error or server down - Just warn, keep the user logged in
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