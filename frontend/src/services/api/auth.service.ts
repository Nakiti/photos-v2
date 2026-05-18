import apiClient from '../apiClient';
import { User } from '../../types';

export interface AuthResponse {
  token: string;
  refreshToken: string;
  user: User;
}

export const register = async (data: any): Promise<AuthResponse> => {
  const response = await apiClient.post('/api/v1/auth/register', data);
  return response.data;
};

export const login = async (data: any): Promise<AuthResponse> => {
  const response = await apiClient.post('/api/v1/auth/login', data);
  return response.data;
};

export const refreshTokens = async (refreshToken: string): Promise<{ token: string; refreshToken: string }> => {
  const response = await apiClient.post('/api/v1/auth/refresh', { refreshToken });
  return response.data;
};

export const logout = async (refreshToken: string): Promise<void> => {
  await apiClient.post('/api/v1/auth/logout', { refreshToken });
};

export const forgotPassword = async (email: string): Promise<void> => {
  await apiClient.post('/api/v1/auth/forgot-password', { email });
};

export const resetPassword = async (code: string, newPassword: string): Promise<void> => {
  await apiClient.post('/api/v1/auth/reset-password', { code, newPassword });
};
