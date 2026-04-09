import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || '/api';
const API = axios.create({ baseURL: API_BASE });

API.interceptors.request.use((config) => {
  const token = localStorage.getItem('saphir_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

API.interceptors.response.use(
  (r) => r,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('saphir_token');
      localStorage.removeItem('saphir_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default API;
