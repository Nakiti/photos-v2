import apiClient from '../apiClient';
import { User } from '../../types'; // Assuming you have a User type

// The expected response from a successful login/register
interface AuthResponse {
  token: string;
  user: User;
}

/**
 * Registers a new user.
 * @param data - The user's registration details (email, password, name).
 * @returns A promise that resolves to an AuthResponse object.
 */
export const register = async (data: any): Promise<AuthResponse> => {
  const response = await apiClient.post('/api/v1/auth/register', data);
  return response.data;
};

/**
 * Logs in an existing user.
 * @param data - The user's login credentials (email, password).
 * @returns A promise that resolves to an AuthResponse object.
 */
export const login = async (data: any): Promise<AuthResponse> => {
  const response = await apiClient.post('/api/v1/auth/login', data);
  return response.data;
};
