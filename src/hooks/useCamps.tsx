import { Notification, toast } from '@/components/ui'
import { campApi } from '@/services/api'
import type { Camp, CreateCampInput } from '@/services/CampService'
import { useCallback, useEffect, useState } from 'react'

export const useCamps = (locationId?: string) => {
    const [camps, setCamps] = useState<Camp[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const fetchCamps = useCallback(async () => {
        try {
            setLoading(true)
            const response = await campApi.getAll(locationId ? { locationId } : undefined)
            console.log('API Response:', response)

            // Camps route returns array directly, employees/rooms return wrapped format
            const campsData = Array.isArray(response?.data)
                ? response.data
                : Array.isArray(response?.data?.data)
                  ? response.data.data
                  : []
            setCamps(campsData)

            setError(null)
            return campsData // ✅ return data
        } catch (err) {
            console.error('Error fetching camps:', err)
            setError('Failed to fetch camps')
            setCamps([])
        } finally {
            setLoading(false)
        }
    }, [locationId])

    /**
     * Creates a camp together with its buildings in one request, so a new camp
     * is immediately able to accept rooms. `location` is not sent — the server
     * derives the denormalized label from locationId.
     */
    const addCamp = async (campData: CreateCampInput) => {
        try {
            if (!campData.locationId) {
                throw new Error('A location must be selected for this camp.')
            }

            const payload: CreateCampInput = {
                name: campData.name?.trim() || 'Unnamed Camp',
                locationId: campData.locationId,
                description: campData.description || '',
                price: campData.price ?? 0,
                image: campData.image,
                buildings: campData.buildings ?? [],
            }

            const response = await campApi.create(payload)

            if (!response || !response.data) {
                throw new Error('Invalid response from server')
            }

            await fetchCamps()

            const blocks = payload.buildings?.length ?? 0
            toast.push(
                <Notification title="Success" type="success">
                    {blocks > 0
                        ? `Camp created with ${blocks} building${blocks === 1 ? '' : 's'}.`
                        : 'Camp added successfully!'}
                </Notification>,
            )

            return response.data
        } catch (err: unknown) {
            console.error('Error adding camp:', err)
            const message =
                (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
                (err as Error)?.message ||
                'Failed to add camp'
            toast.push(
                <Notification title="Error" type="danger">
                    {message}
                </Notification>,
            )
            throw err
        }
    }

    const updateCamp = async (id: string, campData: Partial<Camp>) => {
        try {
            const response = await campApi.update(id, campData)
            setCamps((prevCamps) =>
                prevCamps.map((camp) =>
                    camp._id === id ? response.data : camp,
                ),
            )

            toast.push(
                <Notification title="Success" type="success">
                    Camp updated successfully!
                </Notification>,
            )

            return response.data
        } catch (err) {
            console.error('Error updating camp:', err)
            toast.push(
                <Notification title="Error" type="danger">
                    Failed to update camp
                </Notification>,
            )
            throw err
        }
    }

    const deleteCamp = async (id: string) => {
        try {
            await campApi.delete(id)
            setCamps((prev) => prev.filter((camp) => camp._id !== id))

            toast.push(
                <Notification title="Success" type="success">
                    Camp deleted successfully!
                </Notification>,
            )
            return true
        } catch (err) {
            console.error('Error deleting camp:', err)

            // Handle specific error messages from the API
            const errorMessage =
                err.response?.data?.message ||
                err.message ||
                'Failed to delete camp'

            toast.push(
                <Notification title="Error" type="danger">
                    {errorMessage}
                </Notification>,
            )
            throw err
        }
    }

    useEffect(() => {
        fetchCamps()
    }, [fetchCamps])

    return {
        camps,
        loading,
        error,
        addCamp,
        updateCamp,
        deleteCamp,
        fetchCamps,
    }
}

export default useCamps
