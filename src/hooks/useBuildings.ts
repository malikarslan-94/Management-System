import { Notification, toast } from '@/components/ui'
import { buildingApi } from '@/services/api'
import type { Building } from '@/services/BuildingService'
import { createElement, useCallback, useEffect, useState } from 'react'

function notifySuccess(msg: string) {
    toast.push(createElement(Notification, { title: 'Success', type: 'success' }, msg))
}
function notifyError(msg: string) {
    toast.push(createElement(Notification, { title: 'Error', type: 'danger' }, msg))
}

export const useBuildings = (campId?: string) => {
    const [buildings, setBuildings] = useState<Building[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const fetchBuildings = useCallback(async () => {
        try {
            setLoading(true)
            const response = await buildingApi.getAll(campId ? { campId } : undefined)
            const data = Array.isArray(response.data) ? response.data : []
            setBuildings(data)
            setError(null)
            return data
        } catch (err) {
            console.error('Error fetching buildings:', err)
            setError('Failed to fetch buildings')
            setBuildings([])
        } finally {
            setLoading(false)
        }
    }, [campId])

    const addBuilding = async (data: Omit<Building, '_id' | 'id'>) => {
        try {
            const response = await buildingApi.create(data)
            await fetchBuildings()
            notifySuccess('Building added successfully!')
            return response.data
        } catch (err: any) {
            const msg = err?.response?.data?.message || err?.message || 'Failed to add building'
            notifyError(msg)
            throw err
        }
    }

    const updateBuilding = async (id: string, data: Partial<Building>) => {
        try {
            const response = await buildingApi.update(id, data)
            setBuildings((prev) => prev.map((b) => (b._id === id ? response.data : b)))
            notifySuccess('Building updated successfully!')
            return response.data
        } catch (err: any) {
            const msg = err?.response?.data?.message || err?.message || 'Failed to update building'
            notifyError(msg)
            throw err
        }
    }

    const deleteBuilding = async (id: string) => {
        try {
            await buildingApi.delete(id)
            setBuildings((prev) => prev.filter((b) => b._id !== id))
            notifySuccess('Building deleted successfully!')
            return true
        } catch (err: any) {
            const msg = err?.response?.data?.message || err?.message || 'Failed to delete building'
            notifyError(msg)
            throw err
        }
    }

    useEffect(() => {
        fetchBuildings()
    }, [fetchBuildings])

    return { buildings, loading, error, fetchBuildings, addBuilding, updateBuilding, deleteBuilding }
}

export default useBuildings
