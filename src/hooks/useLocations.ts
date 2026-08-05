import { Notification, toast } from '@/components/ui'
import { locationApi } from '@/services/api'
import type { Location, LocationSummary } from '@/services/LocationService'
import { createElement, useCallback, useEffect, useState } from 'react'

function notifySuccess(msg: string) {
    toast.push(createElement(Notification, { title: 'Success', type: 'success' }, msg))
}
function notifyError(msg: string) {
    toast.push(createElement(Notification, { title: 'Error', type: 'danger' }, msg))
}

export const useLocations = () => {
    const [locations, setLocations] = useState<LocationSummary[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const fetchLocations = useCallback(async () => {
        try {
            setLoading(true)
            const response = await locationApi.getAll()
            const data = Array.isArray(response.data) ? response.data : []
            setLocations(data)
            setError(null)
            return data
        } catch (err) {
            console.error('Error fetching locations:', err)
            setError('Failed to fetch locations')
            setLocations([])
        } finally {
            setLoading(false)
        }
    }, [])

    const addLocation = async (data: Omit<Location, '_id' | 'id'>) => {
        try {
            const response = await locationApi.create(data)
            setLocations((prev) => [...prev, response.data])
            notifySuccess('Location added successfully!')
            return response.data
        } catch (err: any) {
            const msg = err?.response?.data?.message || err?.message || 'Failed to add location'
            notifyError(msg)
            throw err
        }
    }

    const updateLocation = async (id: string, data: Partial<Location>) => {
        try {
            const response = await locationApi.update(id, data)
            setLocations((prev) => prev.map((l) => (l._id === id ? response.data : l)))
            notifySuccess('Location updated successfully!')
            return response.data
        } catch (err: any) {
            const msg = err?.response?.data?.message || err?.message || 'Failed to update location'
            notifyError(msg)
            throw err
        }
    }

    const deleteLocation = async (id: string) => {
        try {
            await locationApi.delete(id)
            setLocations((prev) => prev.filter((l) => l._id !== id))
            notifySuccess('Location deleted successfully!')
            return true
        } catch (err: any) {
            const msg = err?.response?.data?.message || err?.message || 'Failed to delete location'
            notifyError(msg)
            throw err
        }
    }

    useEffect(() => {
        fetchLocations()
    }, [fetchLocations])

    return { locations, loading, error, fetchLocations, addLocation, updateLocation, deleteLocation }
}

export default useLocations
