import axios from 'axios';
import databaseConfig from '@/configs/database.config';

const api = axios.create({
  baseURL: databaseConfig.apiBaseUrl,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const userApi = {
  create: (data:any) => api.post('/api/sign-up', data),
};

export default api;
