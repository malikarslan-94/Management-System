import { roomApi } from '@/services/api'
import { useCallback, useEffect, useState } from 'react'

interface Room {
    _id: string
    camp: string | { _id: string; name: string; location: string } // Can be ID string or populated camp object
    roomNumber: string
    type: 'single' | 'double' | 'suite' | 'family'
    capacity: number
    price: number
    amenities: string[]
    isAvailable: boolean
    images?: string[]
    description?: string
}

/**
 * useRooms Hook
 *
 * Fetches and manages rooms data.
 *
 * @param campId - Optional camp ID to filter rooms by camp
 *
 * Behavior:
 * - If campId is provided: Fetches only rooms belonging to that specific camp
 *   (calls GET /api/rooms/camp/:campId)
 *
 * - If campId is NOT provided: Fetches ALL rooms from ALL camps
 *   (calls GET /api/rooms)
 *
 * Usage examples:
 * - useRooms() - Fetches all rooms (used in Home.tsx and AdminDashboard.jsx)
 * - useRooms('camp123') - Fetches only rooms for camp with ID 'camp123'
 *
 * Important Note:
 * - The camps list shows `totalRooms` from the Camp model, which is a stored
 *   number field (like "capacity" or "planned rooms"), NOT a count of actual
 *   Room documents.
 * - This hook fetches actual Room documents from the database.
 * - These two numbers may differ! For example:
 *   - Camp A might have totalRooms: 5 (planned/configured)
 *   - But only 2 actual Room documents exist in the database
 * - The console will log a breakdown showing actual rooms per camp.
 */
export const useRooms = (campId?: string) => {
    const [rooms, setRooms] = useState<Room[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const fetchRooms = useCallback(async () => {
        try {
            setLoading(true)
            // If campId is provided, fetch rooms for that specific camp
            // Otherwise, fetch ALL rooms from all camps
            const response = campId
                ? await roomApi.getByCampId(campId)
                : await roomApi.getAll()

            console.log('Rooms API Response:', response)
            console.log(
                'CampId provided:',
                campId || 'none (fetching all rooms)',
            )

            // Axios wraps the response in .data property
            // Server returns array directly, so response.data is the array
            // Handle both direct array and wrapped response formats for compatibility
            let roomsData = response.data

            // If response.data is an object with a data property (nested response)
            if (
                roomsData &&
                typeof roomsData === 'object' &&
                !Array.isArray(roomsData) &&
                roomsData.data
            ) {
                roomsData = roomsData.data
            }

            // Ensure we have an array
            roomsData = Array.isArray(roomsData) ? roomsData : []

            console.log('Extracted rooms data:', roomsData)
            console.log('Total rooms fetched:', roomsData.length)

            // Log breakdown by camp to help debug
            if (roomsData.length > 0 && !campId) {
                const roomsByCamp: Record<string, number> = {}
                roomsData.forEach((room: Room) => {
                    const campIdValue =
                        typeof room.camp === 'object' && room.camp?._id
                            ? room.camp._id
                            : room.camp
                    const campName =
                        typeof room.camp === 'object' && room.camp?.name
                            ? room.camp.name
                            : 'Unknown'
                    roomsByCamp[campName] = (roomsByCamp[campName] || 0) + 1
                })
                console.log('Rooms breakdown by camp:', roomsByCamp)
                console.log(
                    'Note: Camp totalRooms field may differ from actual Room documents count',
                )
            }

            setRooms(roomsData)
            setError(null)
            return roomsData
        } catch (err) {
            console.error('Error fetching rooms:', err)
            setError('Failed to fetch rooms')
            alert('Failed to load rooms. Please try again.')
            setRooms([]) // Reset to empty array on error
        } finally {
            setLoading(false)
        }
    }, [campId])

    const addRoom = async (roomData: Omit<Room, '_id'>) => {
        try {
            const response = await roomApi.create(roomData)
            // Handle both direct object and wrapped response formats
            const newRoom = response.data?.data || response.data
            // Add the new room to the beginning of the list (latest first)
            setRooms((prev) => [newRoom, ...(Array.isArray(prev) ? prev : [])])
            alert('Room added successfully')
            return newRoom
        } catch (err) {
            console.error('Error adding room:', err)
            alert('Failed to add room')
            throw err
        }
    }

    const updateRoom = async (id: string, roomData: Partial<Room>) => {
        try {
            const response = await roomApi.update(id, roomData)
            const updatedRoom = response.data?.data || response.data
            setRooms((prev) =>
                (Array.isArray(prev) ? prev : []).map((room) =>
                    room._id === id ? updatedRoom : room,
                ),
            )
            alert('Room updated successfully')
            return updatedRoom
        } catch (err) {
            console.error('Error updating room:', err)
            alert('Failed to update room')
            throw err
        }
    }

    const deleteRoom = async (id: string) => {
        try {
            await roomApi.delete(id)
            setRooms((prev) =>
                (Array.isArray(prev) ? prev : []).filter(
                    (room) => room._id !== id,
                ),
            )
            alert('Room deleted successfully')
            return true
        } catch (err) {
            console.error('Error deleting room:', err)
            alert('Failed to delete room. Please try again.')
            throw err
        }
    }

    useEffect(() => {
        fetchRooms()
    }, [fetchRooms])

    return {
        rooms,
        loading,
        error,
        fetchRooms,
        addRoom,
        updateRoom,
        deleteRoom,
    }
}

export default useRooms
