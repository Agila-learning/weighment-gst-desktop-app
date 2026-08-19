import axios from 'axios';

export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'x-app-type': 'WEIGHBRIDGE'
  }
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token && token !== 'OFFLINE_TOKEN') {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
