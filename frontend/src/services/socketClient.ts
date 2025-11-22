import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../stores/auth.store';

const API_URL = 'http://100.115.255.139:4000/';

// Get the token directly from the Zustand store's state
// This is a non-hook way to get the token, which is perfect for a service file.
const getAuthToken = () => {
  return useAuthStore.getState().token;
};

// Create the socket instance
export const socket: Socket = io(API_URL, {
  /**
   * IMPORTANT:
   * We set autoConnect to false so the app doesn't try to connect
   * before the user is logged in. We will manually call `socket.connect()`
   * inside the `useAuth` hook after a successful login.
   */
  autoConnect: false,
  
  /**
   * This function automatically sends the user's auth token
   * with every connection attempt. Your backend's socket middleware
   * will use this to authenticate the user.
   */
  auth: (callback) => {
    const token = getAuthToken();
    callback({ token });
  },
});

// --- Optional: Add global logging for debugging ---

socket.on('connect', () => {
  console.log(`[Socket] Connected to server with ID: ${socket.id}`);
});

socket.on('disconnect', (reason) => {
  console.log(`[Socket] Disconnected from server: ${reason}`);
});

socket.on('connect_error', (err) => {
  console.error(`[Socket] Connection Error: ${err.message}`);
});