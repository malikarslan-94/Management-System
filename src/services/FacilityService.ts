import { facilityApi } from './api'

export type FacilityKind =
    | 'mosque'
    | 'mess'
    | 'playing_area'
    | 'recreation_center'
    | 'medical'
    | 'laundry'
    | 'parking'
    | 'other'

export interface CampFacility {
    _id?: string
    id?: string
    campId: string
    kind: FacilityKind
    name: string
    capacity?: number
    description?: string
    openingHours?: string
    status?: 'active' | 'inactive' | 'maintenance'
}

const normalizeFacility = (raw: any): CampFacility => ({
    _id: raw._id,
    id: raw._id,
    campId: typeof raw.campId === 'object' ? raw.campId?._id : raw.campId,
    kind: raw.kind,
    name: raw.name,
    capacity: raw.capacity ?? 0,
    description: raw.description,
    openingHours: raw.openingHours,
    status: raw.status ?? 'active',
})

export const getFacilities = async (params?: { campId?: string; kind?: FacilityKind }): Promise<CampFacility[]> => {
    const response = await facilityApi.getAll(params)
    const data = Array.isArray(response.data) ? response.data : []
    return data.map(normalizeFacility)
}

export const getFacilityById = async (id: string): Promise<CampFacility> => {
    const response = await facilityApi.getById(id)
    return normalizeFacility(response.data)
}

export const createFacility = async (facility: Omit<CampFacility, '_id' | 'id'>): Promise<CampFacility> => {
    const response = await facilityApi.create(facility)
    return normalizeFacility(response.data)
}

export const updateFacility = async (id: string, facility: Partial<CampFacility>): Promise<CampFacility> => {
    const response = await facilityApi.update(id, facility)
    return normalizeFacility(response.data)
}

export const deleteFacility = async (id: string): Promise<void> => {
    await facilityApi.delete(id)
}
