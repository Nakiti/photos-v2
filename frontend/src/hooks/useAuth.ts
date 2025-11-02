import { useAuthStore } from '../stores/auth.store';
import * as authService from '../services/api/auth.service';
import * as Keychain from 'react-native-keychain';
import apiClient from '../services/apiClient';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { syncCurrentUser } from '../services/sync/user.sync';
import { useDatabase } from '@nozbe/watermelondb/react';
import { getMyProfile } from '../services/api/userService';

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
      try {
        const credentials = await Keychain.getGenericPassword();
        if (credentials) {
          const storedToken = credentials.password;
          apiClient.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
          setToken(storedToken);

          // --- 7. VERIFY TOKEN & SYNC USER ON APP LOAD ---
          const userProfile = await getMyProfile();
          console.log("user ", userProfile)
          setUser(userProfile);
          await syncCurrentUser(database, userProfile);
        }
      } catch (error) {
        // This will fail if the token is expired, so log the user out
        console.error('Auth check failed, logging out:', error);
        await logout(); // Ensure user is logged out if token is bad
      }
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
  
