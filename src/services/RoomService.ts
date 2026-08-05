import { roomApi } from './api'

export type RoomStatus = 'available' | 'occupied' | 'maintenance' | 'cleaning'
/** Mirrors the backend enum in server/models/Room.js. */
export type RoomType = 'single' | 'double' | 'suite' | 'family'

export interface Room {
    id: string
    campId: string
    /** Always set — the API rejects rooms without a building. */
    buildingId: string
    buildingName?: string
    floor: number
    roomNumber: string
    type: RoomType
    capacity: number
    status: RoomStatus
    pricePerNight: number
    amenities: string[]
}

/** One floor's worth of rooms to generate. */
export interface FloorSpec {
    floor: number
    count: number
    /** Must end in digits — "101" yields 101,102,…; "A-01" yields A-01,A-02,… */
    startNumber: string
    type: RoomType
    capacity: number
    price?: number
    amenities?: string[]
}

const idOf = (value: unknown): string =>
    typeof value === 'object' && value !== null ? String((value as { _id?: string })._id ?? '') : String(value ?? '')

/**
 * Backend → frontend shape. `status` is now a first-class backend field, so the
 * old isAvailable-to-status guesswork is gone; the fallback only covers
 * documents that predate the migration.
 */
const transformRoom = (backendRoom: any): Room | null => {
    if (!backendRoom || (!backendRoom._id && !backendRoom.id)) {
        console.warn('Skipping invalid room:', backendRoom)
        return null
    }

    const status: RoomStatus =
        backendRoom.status ?? (backendRoom.isAvailable === false ? 'occupied' : 'available')

    return {
        id: backendRoom._id || backendRoom.id,
        campId: idOf(backendRoom.camp ?? backendRoom.campId),
        buildingId: idOf(backendRoom.buildingId),
        buildingName:
            typeof backendRoom.buildingId === 'object' && backendRoom.buildingId
                ? backendRoom.buildingId.name
                : undefined,
        floor: backendRoom.floor || 1,
        roomNumber: backendRoom.roomNumber || 'N/A',
        type: (backendRoom.type || 'single') as RoomType,
        capacity: backendRoom.capacity || 1,
        status,
        pricePerNight: backendRoom.price ?? backendRoom.pricePerNight ?? 0,
        amenities: Array.isArray(backendRoom.amenities) ? backendRoom.amenities : [],
    }
}

/** Frontend → backend. camp is omitted deliberately: the API derives it from the building. */
const toBackend = (updates: Partial<Room>) => {
    const payload: Record<string, unknown> = {}
    if (updates.buildingId !== undefined) payload.buildingId = updates.buildingId
    if (updates.floor !== undefined) payload.floor = updates.floor
    if (updates.roomNumber !== undefined) payload.roomNumber = updates.roomNumber
    if (updates.type !== undefined) payload.type = updates.type
    if (updates.capacity !== undefined) payload.capacity = updates.capacity
    if (updates.status !== undefined) payload.status = updates.status
    if (updates.pricePerNight !== undefined) payload.price = updates.pricePerNight
    if (updates.amenities !== undefined) payload.amenities = updates.amenities
    return payload
}

export const getRooms = async (campId?: string): Promise<Room[]> => {
    try {
        const response = campId ? await roomApi.getByCampId(campId) : await roomApi.getAll()
        let roomsData = response?.data
        if (roomsData && typeof roomsData === 'object' && !Array.isArray(roomsData) && roomsData.data) {
            roomsData = roomsData.data
        }
        const rooms = Array.isArray(roomsData) ? roomsData : []
        return rooms.map(transformRoom).filter((room): room is Room => room !== null)
    } catch (error) {
        console.error('Error fetching rooms:', error)
        return []
    }
}

export const getRoomsByBuilding = async (buildingId: string): Promise<Room[]> => {
    const response = await roomApi.getByBuildingId(buildingId)
    const rooms = Array.isArray(response?.data) ? response.data : []
    return rooms.map(transformRoom).filter((room): room is Room => room !== null)
}

export const createRoom = async (room: Omit<Room, 'id' | 'campId'>): Promise<Room | null> => {
    const response = await roomApi.create(toBackend(room))
    return transformRoom(response.data)
}

/**
 * Generates every room for one or more floors of a building in a single request.
 * Rejects the whole batch if any number collides, so a partial floor is never left behind.
 */
export const generateRooms = async (
    buildingId: string,
    floors: FloorSpec[],
): Promise<{ created: number; rooms: Room[] }> => {
    const response = await roomApi.bulkCreate({ buildingId, floors })
    const rooms = Array.isArray(response.data?.rooms) ? response.data.rooms : []
    return {
        created: response.data?.created ?? rooms.length,
        rooms: rooms.map(transformRoom).filter((room): room is Room => room !== null),
    }
}

export const updateRoom = async (id: string, updates: Partial<Room>): Promise<Room | null> => {
    const response = await roomApi.update(id, toBackend(updates))
    return transformRoom(response?.data)
}

export const deleteRoom = async (id: string): Promise<void> => {
    // Previously a raw fetch to `${API_BASE_URL}/rooms/:id`, which omitted the
    // /api prefix and always 404'd.
    await roomApi.delete(id)
}
