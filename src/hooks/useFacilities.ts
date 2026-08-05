import { Notification, toast } from '@/components/ui'
import { facilityApi } from '@/services/api'
import type { CampFacility, FacilityKind } from '@/services/FacilityService'
import { createElement, useCallback, useEffect, useState } from 'react'

function notifySuccess(msg: string) {
    toast.push(createElement(Notification, { title: 'Success', type: 'success' }, msg))
}
function notifyError(msg: string) {
    toast.push(createElement(Notification, { title: 'Error', type: 'danger' }, msg))
}

export const useFacilities = (params?: { campId?: string; kind?: FacilityKind }) => {
    const [facilities, setFacilities] = useState<CampFacility[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const fetchFacilities = useCallback(async () => {
        try {
            setLoading(true)
            const response = await facilityApi.getAll(params)
            const data = Array.isArray(response.data) ? response.data : []
            setFacilities(data)
            setError(null)
            return data
        } catch (err) {
            console.error('Error fetching facilities:', err)
            setError('Failed to fetch facilities')
            setFacilities([])
        } finally {
            setLoading(false)
        }
    }, [params?.campId, params?.kind])

    const addFacility = async (data: Omit<CampFacility, '_id' | 'id'>) => {
        try {
            const response = await facilityApi.create(data)
            setFacilities((prev) => [...prev, response.data])
            notifySuccess('Facility added successfully!')
            return response.data
        } catch (err: any) {
            const msg = err?.response?.data?.message || err?.message || 'Failed to add facility'
            notifyError(msg)
            throw err
        }
    }

    const updateFacility = async (id: string, data: Partial<CampFacility>) => {
        try {
            const response = await facilityApi.update(id, data)
            setFacilities((prev) => prev.map((f) => (f._id === id ? response.data : f)))
            notifySuccess('Facility updated successfully!')
            return response.data
        } catch (err: any) {
            const msg = err?.response?.data?.message || err?.message || 'Failed to update facility'
            notifyError(msg)
            throw err
        }
    }

    const deleteFacility = async (id: string) => {
        try {
            await facilityApi.delete(id)
            setFacilities((prev) => prev.filter((f) => f._id !== id))
            notifySuccess('Facility deleted successfully!')
            return true
        } catch (err: any) {
            const msg = err?.response?.data?.message || err?.message || 'Failed to delete facility'
            notifyError(msg)
            throw err
        }
    }

    useEffect(() => {
        fetchFacilities()
    }, [fetchFacilities])

    return { facilities, loading, error, fetchFacilities, addFacility, updateFacility, deleteFacility }
}

export default useFacilities
