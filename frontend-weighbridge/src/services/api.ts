import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3000/api',
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
