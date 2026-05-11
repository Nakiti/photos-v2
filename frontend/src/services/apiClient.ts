import axios, { type InternalAxiosRequestConfig } from "axios";
import * as Keychain from 'react-native-keychain';
import { useAuthStore } from '../stores/auth.store';
import { socket } from './socketClient';

const API_URL = 'http://localhost:4000/';

const apiClient = axios.create({
  baseURL: API_URL,
  withCredentials: true,
});

// Queue of requests that arrived while a token refresh was in flight.
// Once refresh resolves, each pending request is retried with the new token.
type QueueEntry = { resolve: (token: string) => void; reject: (err: unknown) => void };
let refreshQueue: QueueEntry[] = [];
let isRefreshing = false;

function flushQueue(err: unknown, token: string | null) {
  refreshQueue.forEach(entry => (err ? entry.reject(err) : entry.resolve(token!)));
  refreshQueue = [];
}

async function doLogout() {
  delete apiClient.defaults.headers.common['Authorization'];
  if (socket.connected) socket.disconnect();
  await Promise.all([
    Keychain.resetGenericPassword(),
    Keychain.resetGenericPassword({ service: 'focal_user_id' }),
    Keychain.resetGenericPassword({ service: 'focal_refresh_token' }),
  ]).catch(() => {});
  useAuthStore.getState().logout();
}

apiClient.interceptors.response.use(
  response => response,
  async (error) => {
    const original: InternalAxiosRequestConfig & { _retry?: boolean } = error.config;

    if (error.response?.status !== 401 || original._retry) {
      return Promise.reject(error);
    }

    // Don't try to refresh on the refresh endpoint itself — that would loop forever
    if (original.url?.includes('/auth/refresh') || original.url?.includes('/auth/login')) {
      await doLogout();
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise<string>((resolve, reject) => {
        refreshQueue.push({ resolve, reject });
      }).then(token => {
        original.headers['Authorization'] = `Bearer ${token}`;
        original._retry = true;
        return apiClient(original);
      });
    }

    original._retry = true;
    isRefreshing = true;

    try {
      const refreshCreds = await Keychain.getGenericPassword({ service: 'focal_refresh_token' });
      if (!refreshCreds) throw new Error('no_refresh_token');

      // Use a plain axios call (not apiClient) to avoid the interceptor catching a 401 here
      const { data } = await axios.post(`${API_URL}api/v1/auth/refresh`, {
        refreshToken: refreshCreds.password,
      });
      const { token: newToken, refreshToken: newRefresh } = data;

      await Keychain.setGenericPassword('userToken', newToken);
      await Keychain.setGenericPassword('refresh', newRefresh, { service: 'focal_refresh_token' });
      apiClient.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;

      flushQueue(null, newToken);
      original.headers['Authorization'] = `Bearer ${newToken}`;
      return apiClient(original);
    } catch (refreshError) {
      flushQueue(refreshError, null);
      await doLogout();
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);

export default apiClient;
