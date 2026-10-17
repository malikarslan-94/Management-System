import { getAccessToken } from './authToken'
import store, { signOutSuccess } from '@/store'
import databaseConfig from '@/configs/database.config'
import axios from 'axios'

const api = axios.create({
    baseURL: databaseConfig.apiBaseUrl,
    headers: {
        'Content-Type': 'application/json',
    },
})

api.interceptors.request.use(config => {
    const token = getAccessToken()
    if (token) config.headers.Authorization = `Bearer ${token}`
    return config
})
api.interceptors.response.use(response => response, error => {
    if (error.response?.status === 401) store.dispatch(signOutSuccess())
    return Promise.reject(error)
})

// Location API
export const locationApi = {
    getAll: () => api.get('/api/locations'),
    getById: (id: string) => api.get(`/api/locations/${id}`),
    getCamps: (id: string) => api.get(`/api/locations/${id}/camps`),
    create: (data: any) => api.post('/api/locations', data),
    update: (id: string, data: any) => api.patch(`/api/locations/${id}`, data),
    delete: (id: string) => api.delete(`/api/locations/${id}`),
}

// Camp API
export const campApi = {
    getAll: (params?: { locationId?: string }) => api.get('/api/camps', { params }),
    getById: (id: string) => api.get(`/api/camps/${id}`),
    getBuildings: (id: string) => api.get(`/api/camps/${id}/buildings`),
    // `data.buildings` may carry the camp's blocks so a camp is never created
    // without somewhere to put rooms.
    create: (data: any) => api.post('/api/camps', data),
    update: (id: string, data: any) => api.patch(`/api/camps/${id}`, data),
    delete: (id: string) => api.delete(`/api/camps/${id}`),
}

// Building API
export const buildingApi = {
    getAll: (params?: { campId?: string }) => api.get('/api/buildings', { params }),
    getById: (id: string) => api.get(`/api/buildings/${id}`),
    getRooms: (id: string) => api.get(`/api/buildings/${id}/rooms`),
    getFloors: (id: string) => api.get(`/api/buildings/${id}/floors`),
    create: (data: any) => api.post('/api/buildings', data),
    update: (id: string, data: any) => api.patch(`/api/buildings/${id}`, data),
    delete: (id: string) => api.delete(`/api/buildings/${id}`),
}

// Camp Facility API
export const facilityApi = {
    getAll: (params?: { campId?: string; kind?: string }) => api.get('/api/facilities', { params }),
    getById: (id: string) => api.get(`/api/facilities/${id}`),
    create: (data: any) => api.post('/api/facilities', data),
    update: (id: string, data: any) => api.patch(`/api/facilities/${id}`, data),
    delete: (id: string) => api.delete(`/api/facilities/${id}`),
}

// Room API
export const roomApi = {
    getAll: (params?: { campId?: string; buildingId?: string; floor?: number; status?: string }) =>
        api.get('/api/rooms', { params }),
    getByCampId: (campId: string) => api.get(`/api/rooms/camp/${campId}`),
    getByBuildingId: (buildingId: string) => api.get(`/api/rooms/building/${buildingId}`),
    getById: (id: string) => api.get(`/api/rooms/${id}`),
    create: (data: any) => api.post('/api/rooms', data),
    // Generates a whole floor (or several) at once; all-or-nothing.
    bulkCreate: (data: {
        buildingId: string
        floors: Array<{
            floor: number
            count: number
            startNumber: string
            type: string
            capacity: number
            price?: number
            amenities?: string[]
        }>
    }) => api.post('/api/rooms/bulk', data),
    update: (id: string, data: any) => api.patch(`/api/rooms/${id}`, data),
    delete: (id: string) => api.delete(`/api/rooms/${id}`),
}

// Employee API
export const employeeApi = {
    getAll: (params?: any) => api.get('/api/employees', { params }),
    getById: (id: string) => api.get(`/api/employees/${id}`),
    create: (data: any) => api.post('/api/employees', data),
    update: (id: string, data: any) => api.patch(`/api/employees/${id}`, data),
    delete: (id: string) => api.delete(`/api/employees/${id}`),
}

// Room Assignment API
export const assignmentApi = {
    getAll: (params?: any) => api.get('/api/assignments', { params }),
    getById: (id: string) => api.get(`/api/assignments/${id}`),
    create: (data: any) => api.post('/api/assignments', data),
    update: (id: string, data: any) => api.put(`/api/assignments/${id}`, data),
    delete: (id: string) => api.delete(`/api/assignments/${id}`),
}

export default api
