import { Notification, toast } from '@/components/ui'
import { assignmentApi } from '@/services/api'
import type {
    RoomAssignment,
    AssignRoomPayload,
    CheckoutRoomPayload,
    AssignmentFilters,
    AssignmentResponse,
} from '@/services/RoomAssignmentService'
import { useCallback, useEffect, useState } from 'react'

export const useRoomAssignments = (filters?: AssignmentFilters) => {
    const [assignments, setAssignments] = useState<RoomAssignment[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [pagination, setPagination] = useState({
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 1,
    })

    const fetchAssignments = useCallback(
        async (newFilters?: AssignmentFilters) => {
            try {
                setLoading(true)
                const filterParams = newFilters || filters
                const response = await assignmentApi.getAll(filterParams)

                console.log('Assignments API Response:', response)

                const assignmentsData = response?.data?.data || []
                const paginationData = response?.data || {}

                setAssignments(
                    Array.isArray(assignmentsData) ? assignmentsData : [],
                )
                setPagination({
                    total: paginationData.total || 0,
                    page: paginationData.page || 1,
                    limit: paginationData.limit || 10,
                    totalPages: paginationData.totalPages || 1,
                })
                setError(null)
                return assignmentsData
            } catch (err) {
                console.error('Error fetching assignments:', err)
                setError('Failed to fetch assignments')
                setAssignments([])
                toast.push(
                    <Notification title="Error" type="danger">
                        Failed to load room assignments. Please try again.
                    </Notification>,
                )
            } finally {
                setLoading(false)
            }
        },
        [filters],
    )

    const assignRoom = async (payload: AssignRoomPayload) => {
        try {
            const response = await assignmentApi.create(payload)

            console.log('Assign Room Response:', response)

            if (!response) {
                throw new Error('Invalid response from server')
            }

            const newAssignment =
                response.data?.data ||
                (Array.isArray(response.data)
                    ? response.data[0]
                    : response.data)

            if (!newAssignment) {
                throw new Error('Invalid response format from server')
            }

            setAssignments((prev) => [newAssignment, ...prev])
            setPagination((prev) => ({
                ...prev,
                total: prev.total + 1,
            }))

            toast.push(
                <Notification title="Success" type="success">
                    Room assigned successfully!
                </Notification>,
            )

            return newAssignment
        } catch (err: any) {
            console.error('Error assigning room:', err)
            const errorMessage =
                err.response?.data?.message ||
                err.message ||
                'Failed to assign room'
            toast.push(
                <Notification title="Error" type="danger">
                    {errorMessage}
                </Notification>,
            )
            throw err
        }
    }

    const checkoutRoom = async (payload: CheckoutRoomPayload) => {
        try {
            const response = await assignmentApi.update(payload.assignmentId, {
                checkOutTime: payload.checkOutTime || new Date().toISOString(),
                status: 'completed',
            })

            if (!response) {
                throw new Error('Invalid response from server')
            }

            const updatedAssignment =
                response.data?.data ||
                (Array.isArray(response.data)
                    ? response.data[0]
                    : response.data)

            if (!updatedAssignment) {
                throw new Error('Invalid response format from server')
            }

            setAssignments((prevAssignments) =>
                prevAssignments.map((assignment) =>
                    assignment._id === payload.assignmentId
                        ? updatedAssignment
                        : assignment,
                ),
            )

            toast.push(
                <Notification title="Success" type="success">
                    Room checkout completed successfully!
                </Notification>,
            )

            return updatedAssignment
        } catch (err: any) {
            console.error('Error checking out room:', err)
            const errorMessage =
                err.response?.data?.message ||
                err.message ||
                'Failed to checkout room'
            toast.push(
                <Notification title="Error" type="danger">
                    {errorMessage}
                </Notification>,
            )
            throw err
        }
    }

    const cancelAssignment = async (assignmentId: string) => {
        try {
            await assignmentApi.delete(assignmentId)

            setAssignments((prev) =>
                prev.filter((assignment) => assignment._id !== assignmentId),
            )
            setPagination((prev) => ({
                ...prev,
                total: Math.max(0, prev.total - 1),
            }))

            toast.push(
                <Notification title="Success" type="success">
                    Assignment cancelled successfully!
                </Notification>,
            )
            return true
        } catch (err: any) {
            console.error('Error cancelling assignment:', err)

            const errorMessage =
                err.response?.data?.message ||
                err.message ||
                'Failed to cancel assignment'

            toast.push(
                <Notification title="Error" type="danger">
                    {errorMessage}
                </Notification>,
            )
            throw err
        }
    }

    useEffect(() => {
        fetchAssignments()
    }, [fetchAssignments])

    return {
        assignments,
        loading,
        error,
        pagination,
        assignRoom,
        checkoutRoom,
        cancelAssignment,
        fetchAssignments,
    }
}

export default useRoomAssignments


