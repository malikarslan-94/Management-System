import { buildingApi } from './api'

export interface Building {
    _id?: string
    id?: string
    campId: string
    name: string
    type?: 'residential' | 'admin' | 'medical' | 'storage' | 'other'
    floors?: number
    totalRooms?: number
    description?: string
    status?: 'active' | 'inactive' | 'maintenance'
    roomCount?: number
}

const normalizeBuilding = (raw: any): Building => ({
    _id: raw._id,
    id: raw._id,
    campId: typeof raw.campId === 'object' ? raw.campId?._id : raw.campId,
    name: raw.name,
    type: raw.type ?? 'residential',
    floors: raw.floors ?? 1,
    totalRooms: raw.totalRooms ?? 0,
    description: raw.description,
    status: raw.status ?? 'active',
    roomCount: raw.roomCount ?? 0,
})

export const getBuildings = async (campId?: string): Promise<Building[]> => {
    const response = await buildingApi.getAll(campId ? { campId } : undefined)
    const data = Array.isArray(response.data) ? response.data : []
    return data.map(normalizeBuilding)
}

export const getBuildingById = async (id: string): Promise<Building> => {
    const response = await buildingApi.getById(id)
    return normalizeBuilding(response.data)
}

export const createBuilding = async (building: Omit<Building, '_id' | 'id'>): Promise<Building> => {
    const response = await buildingApi.create(building)
    return normalizeBuilding(response.data)
}

export const updateBuilding = async (id: string, building: Partial<Building>): Promise<Building> => {
    const response = await buildingApi.update(id, building)
    return normalizeBuilding(response.data)
}

export const deleteBuilding = async (id: string): Promise<void> => {
    await buildingApi.delete(id)
}
