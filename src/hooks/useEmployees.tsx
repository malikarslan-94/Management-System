import { Notification, toast } from '@/components/ui'
import { employeeApi } from '@/services/api'
import type {
    CreateEmployeeData,
    Employee,
    EmployeeFilters,
    UpdateEmployeeData,
} from '@/services/EmployeeService'
import { useCallback, useEffect, useState } from 'react'

export const useEmployees = (filters?: EmployeeFilters) => {
    const [employees, setEmployees] = useState<Employee[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [pagination, setPagination] = useState({
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 1,
    })

    const fetchEmployees = useCallback(
        async (newFilters?: EmployeeFilters) => {
            try {
                setLoading(true)
                const filterParams = newFilters || filters
                const response = await employeeApi.getAll(filterParams)

                console.log('Employees API Response:', response)

                const employeesData = response?.data?.data || []
                const paginationData = response?.data || {}

                setEmployees(Array.isArray(employeesData) ? employeesData : [])
                setPagination({
                    total: paginationData.total || 0,
                    page: paginationData.page || 1,
                    limit: paginationData.limit || 10,
                    totalPages: paginationData.totalPages || 1,
                })
                setError(null)
                return employeesData
            } catch (err) {
                console.error('Error fetching employees:', err)
                setError('Failed to fetch employees')
                setEmployees([])
                toast.push(
                    <Notification title="Error" type="danger">
                        Failed to load employees. Please try again.
                    </Notification>,
                )
            } finally {
                setLoading(false)
            }
        },
        [filters],
    )

    const addEmployee = async (employeeData: CreateEmployeeData) => {
        try {
            const response = await employeeApi.create(employeeData)

            console.log('Create Employee Response:', response)

            if (!response) {
                throw new Error('Invalid response from server')
            }

            // Handle both direct object and wrapped response formats
            const newEmployee =
                response.data?.data ||
                (Array.isArray(response.data)
                    ? response.data[0]
                    : response.data)

            if (!newEmployee) {
                throw new Error('Invalid response format from server')
            }

            setEmployees((prev) => [...prev, newEmployee])
            toast.push(
                <Notification title="Success" type="success">
                    Employee added successfully!
                </Notification>,
            )

            return newEmployee
        } catch (err: any) {
            console.error('Error adding employee:', err)
            console.error('Error details:', {
                message: err.message,
                response: err.response?.data,
                status: err.response?.status,
            })
            const errorMessage =
                err.response?.data?.message ||
                err.message ||
                'Failed to add employee'
            toast.push(
                <Notification title="Error" type="danger">
                    {errorMessage}
                </Notification>,
            )
            throw err
        }
    }

    const updateEmployee = async (
        id: string,
        employeeData: UpdateEmployeeData,
    ) => {
        try {
            const response = await employeeApi.update(id, employeeData)

            if (!response) {
                throw new Error('Invalid response from server')
            }

            // Handle both direct object and wrapped response formats
            const updatedEmployee =
                response.data?.data ||
                (Array.isArray(response.data)
                    ? response.data[0]
                    : response.data)

            if (!updatedEmployee) {
                throw new Error('Invalid response format from server')
            }

            setEmployees((prevEmployees) =>
                prevEmployees.map((employee) =>
                    employee._id === id ? updatedEmployee : employee,
                ),
            )

            toast.push(
                <Notification title="Success" type="success">
                    Employee updated successfully!
                </Notification>,
            )

            return updatedEmployee
        } catch (err: any) {
            console.error('Error updating employee:', err)
            const errorMessage =
                err.response?.data?.message ||
                err.message ||
                'Failed to update employee'
            toast.push(
                <Notification title="Error" type="danger">
                    {errorMessage}
                </Notification>,
            )
            throw err
        }
    }

    const deleteEmployee = async (id: string) => {
        try {
            await employeeApi.delete(id)
            setEmployees((prev) =>
                prev.filter((employee) => employee._id !== id),
            )

            toast.push(
                <Notification title="Success" type="success">
                    Employee deactivated successfully!
                </Notification>,
            )
            return true
        } catch (err: any) {
            console.error('Error deleting employee:', err)

            const errorMessage =
                err.response?.data?.message ||
                err.message ||
                'Failed to delete employee'

            toast.push(
                <Notification title="Error" type="danger">
                    {errorMessage}
                </Notification>,
            )
            throw err
        }
    }

    useEffect(() => {
        fetchEmployees()
    }, [fetchEmployees])

    return {
        employees,
        loading,
        error,
        pagination,
        addEmployee,
        updateEmployee,
        deleteEmployee,
        fetchEmployees,
    }
}

export default useEmployees
