import { campApi } from './api'

/** A building to create alongside a camp. */
export interface BuildingSpec {
    name: string
    type?: 'residential' | 'admin' | 'medical' | 'storage' | 'other'
    floors?: number
    description?: string
}

export interface Camp {
    _id?: string
    id?: string
    name: string
    /** Required by the API. Populated to an object on reads, sent as an id on writes. */
    locationId?: string | { _id: string; name: string; city?: string; address?: string }
    /** Denormalized location name. Read-only — set locationId to move a camp. */
    location?: string
    status?: 'active' | 'inactive' | 'maintenance'
    description?: string
    price?: number
    image?: string
    rating?: number
    // Server-computed on every read; never sent on writes.
    buildingCount?: number
    totalRooms?: number
    availableRooms?: number
    occupiedRooms?: number
    maintenanceRooms?: number
    cleaningRooms?: number
}

export interface CreateCampInput {
    name: string
    locationId: string
    description?: string
    price?: number
    image?: string
    /**
     * The camp's blocks. Send one entry named after the camp for a single-building
     * camp, or one entry per block. Creating a camp with no buildings leaves it
     * unable to accept rooms, so the UI always sends at least one.
     */
    buildings?: BuildingSpec[]
}

/** locationId as a plain string, whether the API populated it or not. */
export const campLocationId = (camp: Camp): string =>
    typeof camp.locationId === 'object' && camp.locationId ? camp.locationId._id : (camp.locationId as string) || ''

/** One row of the "multiple buildings" editor. */
export interface BuildingRow {
    name: string
    type: string
    floors: string
}

export const emptyBuildingRow = (): BuildingRow => ({ name: '', type: 'residential', floors: '1' })

/**
 * The camp structure step, as captured by a form: either one block or several.
 * Shared by the dashboard and the admin panel so both produce identical payloads.
 */
export interface CampStructure {
    mode: 'single' | 'multi'
    /** Used to name the block in single-building mode. */
    campName: string
    singleFloors: string | number
    rows: BuildingRow[]
}

const toFloors = (value: string | number) => Math.max(1, parseInt(String(value), 10) || 1)

/** Turns the structure step into the buildings the API should create. */
export const buildingsFromStructure = (structure: CampStructure): BuildingSpec[] => {
    if (structure.mode === 'single') {
        const name = structure.campName.trim()
        if (!name) return []
        // A single-building camp names its block after the camp, so the user
        // never types the same name twice and the building dropdown stays
        // hidden when adding rooms.
        return [{ name, type: 'residential', floors: toFloors(structure.singleFloors) }]
    }
    return structure.rows
        .filter((r) => r.name.trim())
        .map((r) => ({
            name: r.name.trim(),
            type: r.type as BuildingSpec['type'],
            floors: toFloors(r.floors),
        }))
}

/** Returns a message to show the user, or null when the structure is usable. */
export const validateStructure = (specs: BuildingSpec[]): string | null => {
    if (specs.length === 0) {
        return 'Name at least one building, or switch to a single-building camp.'
    }
    const names = specs.map((b) => b.name.toLowerCase())
    if (new Set(names).size !== names.length) {
        return 'Two buildings in this camp cannot share a name.'
    }
    return null
}

export const getCamps = async (locationId?: string): Promise<Camp[]> => {
    const response = await campApi.getAll(locationId ? { locationId } : undefined)
    return Array.isArray(response.data) ? response.data : []
}

export const getCampBuildings = async (campId: string) => {
    const response = await campApi.getBuildings(campId)
    return Array.isArray(response.data) ? response.data : []
}

export const createCamp = async (camp: CreateCampInput): Promise<Camp> => {
    const response = await campApi.create(camp)
    return response.data
}

export const updateCamp = async (id: string, camp: Partial<Camp>): Promise<Camp> => {
    const response = await campApi.update(id, camp)
    return response.data
}

export const deleteCamp = async (id: string): Promise<void> => {
    await campApi.delete(id)
}
