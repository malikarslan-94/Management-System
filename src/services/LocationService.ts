import { locationApi } from './api'

export interface Location {
    _id?: string
    id?: string
    name: string
    city?: string
    address?: string
    description?: string
    image?: string
    coordinates?: { lat: number; lng: number }
    status?: 'active' | 'inactive'
    campCount?: number
}

export interface LocationSummary extends Location {
    campCount: number
}

const normalizeLocation = (raw: any): LocationSummary => ({
    _id: raw._id,
    id: raw._id,
    name: raw.name,
    city: raw.city,
    address: raw.address,
    description: raw.description,
    image: raw.image,
    coordinates: raw.coordinates,
    status: raw.status,
    campCount: raw.campCount ?? 0,
})

export const getLocations = async (): Promise<LocationSummary[]> => {
    const response = await locationApi.getAll()
    const data = Array.isArray(response.data) ? response.data : []
    return data.map(normalizeLocation)
}

export const getLocationById = async (id: string): Promise<LocationSummary> => {
    const response = await locationApi.getById(id)
    return normalizeLocation(response.data)
}

export const createLocation = async (loc: Omit<Location, '_id' | 'id'>): Promise<LocationSummary> => {
    const response = await locationApi.create(loc)
    return normalizeLocation(response.data)
}

export const updateLocation = async (id: string, loc: Partial<Location>): Promise<LocationSummary> => {
    const response = await locationApi.update(id, loc)
    return normalizeLocation(response.data)
}

export const deleteLocation = async (id: string): Promise<void> => {
    await locationApi.delete(id)
}
