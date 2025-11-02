import axios from "axios"

// Avoid using process.env directly to prevent dependency on Node types in RN
const API_URL = 'http://localhost:4000/';

const apiClient = axios.create({
    baseURL: API_URL,
    // This is crucial for sending cookies (if you use them for auth)
    // and for handling CORS correctly with a separate backend.
    withCredentials: true,
    // headers: {
    //   'Content-Type': 'application/json',
    // },
  });
  
  export default apiClient;