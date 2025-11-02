import { roomApi } from '@/services/api'
import { useCallback, useEffect, useState } from 'react'

interface Room {
    _id: string
    camp: string
    roomNumber: string
    type: 'single' | 'double' | 'suite' | 'family'
    capacity: number
    price: number
    amenities: string[]
    isAvailable: boolean
    images?: string[]
    description?: string
}

export const useRooms = (campId?: string) => {
    const [rooms, setRooms] = useState<Room[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const fetchRooms = useCallback(async () => {
        try {
            setLoading(true)
            const response = campId
                ? await roomApi.getByCampId(campId)
                : await roomApi.getAll()

            console.log('Rooms API Response:', response)

            // Handle both direct array and wrapped response formats
            const roomsData = response.data?.data || response.data || []
            console.log('Extracted rooms data:', roomsData)
            setRooms(Array.isArray(roomsData) ? roomsData : [])
            setError(null)
            return roomsData
        } catch (err) {
            console.error('Error fetching rooms:', err)
            setError('Failed to fetch rooms')
            alert('Failed to load rooms. Please try again.')
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
