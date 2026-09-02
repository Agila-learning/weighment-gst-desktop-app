import axios from 'axios';

export const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://weighment-gst-desktop-app.onrender.com/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('token');
      window.location.hash = '#/login';
      window.location.reload();
    }
    return Promise.reject(error);
  }
);

export default apiClient;
