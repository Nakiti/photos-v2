import axios from "axios"
import * as Keychain from 'react-native-keychain';
import { useAuthStore } from '../stores/auth.store';
import { socket } from './socketClient';

// Avoid using process.env directly to prevent dependency on Node types in RN
const API_URL = 'http://localhost:4000/';

const apiClient = axios.create({
    baseURL: API_URL,
    withCredentials: true,
  });

// Intercept 401 responses and clear auth state so the app redirects to login.
// This handles mid-session token expiry without requiring the user to manually log out.
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Stop any further requests from carrying the invalid token
      delete apiClient.defaults.headers.common['Authorization'];
      // Disconnect socket — no point keeping it open without a valid session
      if (socket.connected) socket.disconnect();
      // Clear stored credentials (best-effort, don't block the rejection)
      Promise.all([
        Keychain.resetGenericPassword(),
        Keychain.resetGenericPassword({ service: 'focal_user_id' }),
      ]).catch(() => {});
      // Update Zustand — isAuthenticated becomes false, RootStack redirects to AuthStack
      useAuthStore.getState().logout();
    }
    return Promise.reject(error);
  }
);

export default apiClient;