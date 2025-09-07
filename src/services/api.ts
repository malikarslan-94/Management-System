import axios from 'axios';
import databaseConfig from '@/configs/database.config';

const api = axios.create({
  baseURL: databaseConfig.apiBaseUrl,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Camp API
export const campApi = {
  getAll: () => api.get('/api/camps'),
  getById: (id: string) => api.get(`/api/camps/${id}`),
  create: (data: any) => api.post('/api/camps', data),
  update: (id: string, data: any) => api.patch(`/api/camps/${id}`, data),
  delete: (id: string) => api.delete(`/api/camps/${id}`),
};

// Room API
export const roomApi = {
  getAll: () => api.get('/api/rooms'),
  getByCampId: (campId: string) => api.get(`/api/rooms/camp/${campId}`),
  getById: (id: string) => api.get(`/api/rooms/${id}`),
  create: (data: any) => api.post('/api/rooms', data),
  update: (id: string, data: any) => api.patch(`/api/rooms/${id}`, data),
  delete: (id: string) => api.delete(`/api/rooms/${id}`),
};

export default api;
