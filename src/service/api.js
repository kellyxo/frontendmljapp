// Create a central axios configuration file (e.g., src/services/api.js)
import axios from 'axios';

// Create an axios instance with default configuration
const api = axios.create({
  baseURL: 'https://mljapp.onrender.com/japp',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add a request interceptor to add the token to every request
api.interceptors.request.use(
  (config) => {
    // Get token from localStorage or another secure storage
    const token = localStorage.getItem('authToken');
    
    if (token) {
      // Add the Authorization header to the request
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add a response interceptor to handle token expiration
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    
    // If the error is 401 (Unauthorized) and not already retrying
    if (error.response.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        // Here you could refresh the token if your API supports it
        // const refreshToken = localStorage.getItem('refreshToken');
        // const response = await axios.post('your-refresh-token-endpoint', { refreshToken });
        // const newToken = response.data.token;
        // localStorage.setItem('authToken', newToken);
        
        // Update the Authorization header with the new token
        // originalRequest.headers.Authorization = `Bearer ${newToken}`;
        
        // Retry the original request
        // return axios(originalRequest);
        
        // If no refresh token logic, just redirect to login
        window.location.href = '/';
        return Promise.reject(error);
      } catch (refreshError) {
        // If refresh fails, redirect to login
        localStorage.removeItem('authToken');
        window.location.href = '/';
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);

export default api;