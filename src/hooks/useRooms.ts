import { Notification, toast } from '@/components/ui'
import { roomApi } from '@/services/api'
import { createElement, useCallback, useEffect, useState } from 'react'

interface Room {
    _id: string
    camp: string | { _id: string; name: string; location: string }
    roomNumber: string
    type: 'single' | 'double' | 'suite' | 'family'
    capacity: number
    price: number
    amenities: string[]
    isAvailable: boolean
    images?: string[]
    description?: string
}

function notifyError(message: string) {
    toast.push(
        createElement(
            Notification,
            { title: 'Error', type: 'danger' },
            message,
        ),
    )
}

function notifySuccess(message: string) {
    toast.push(
        createElement(
            Notification,
            { title: 'Success', type: 'success' },
            message,
        ),
    )
}

/**
 * useRooms Hook
 *
 * Fetches and manages rooms data.
 *
 * @param campId - Optional camp ID to filter rooms by camp
 */
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
            console.log(
                'CampId provided:',
                campId || 'none (fetching all rooms)',
            )

            let roomsData = response.data

            if (
                roomsData &&
                typeof roomsData === 'object' &&
                !Array.isArray(roomsData) &&
                roomsData.data
            ) {
                roomsData = roomsData.data
            }

            roomsData = Array.isArray(roomsData) ? roomsData : []

            console.log('Extracted rooms data:', roomsData)
            console.log('Total rooms fetched:', roomsData.length)

            if (roomsData.length > 0 && !campId) {
                const roomsByCamp: Record<string, number> = {}
                roomsData.forEach((room: Room) => {
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
            notifyError('Failed to load rooms. Please try again.')
            setRooms([])
        } finally {
            setLoading(false)
        }
    }, [campId])

    const addRoom = async (roomData: Omit<Room, '_id'>) => {
        try {
            const response = await roomApi.create(roomData)
            const newRoom = response.data?.data || response.data
            setRooms((prev) => [newRoom, ...(Array.isArray(prev) ? prev : [])])
            notifySuccess('Room added successfully')
            return newRoom
        } catch (err: unknown) {
            console.error('Error adding room:', err)
            const message =
                (err as { response?: { data?: { message?: string } } })?.response
                    ?.data?.message ||
                (err as Error)?.message ||
                'Failed to add room'
            notifyError(message)
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
            notifySuccess('Room updated successfully')
            return updatedRoom
        } catch (err: unknown) {
            console.error('Error updating room:', err)
            const message =
                (err as { response?: { data?: { message?: string } } })?.response
                    ?.data?.message ||
                (err as Error)?.message ||
                'Failed to update room'
            notifyError(message)
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
            notifySuccess('Room deleted successfully')
            return true
        } catch (err: unknown) {
            console.error('Error deleting room:', err)
            const message =
                (err as { response?: { data?: { message?: string } } })?.response
                    ?.data?.message ||
                (err as Error)?.message ||
                'Failed to delete room. Please try again.'
            notifyError(message)
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
