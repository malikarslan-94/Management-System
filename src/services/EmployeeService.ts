export interface Employee {
    _id?: string
    firstName: string
    lastName: string
    email: string
    phone: string
    iqamaNumber: string
    employeeId: string
    location?: string
    project?: string
    department?: string
    designation?: string
    employeeType: 'Permanent' | 'Temporary' | 'Visitor'
    campId?: string
    currentRoomId?: string | null
    status: 'Active' | 'Inactive'
    roomAssignmentHistory?: RoomAssignment[]
    campId_details?: {
        _id: string
        name: string
        location: string
    }
    currentRoomId_details?: {
        _id: string
        roomNumber: string
        type: string
    }
    createdAt?: Date
    updatedAt?: Date
}

export interface RoomAssignment {
    _id?: string
    roomId: string
    roomId_details?: {
        _id: string
        roomNumber: string
        type: string
    }
    startDate: Date
    endDate: Date | null
}

export interface CreateEmployeeData {
    firstName: string
    lastName: string
    email: string
    phone: string
    iqamaNumber: string
    employeeId: string
    location?: string
    project?: string
    department?: string
    designation?: string
    employeeType?: 'Permanent' | 'Temporary' | 'Visitor'
    campId?: string
    currentRoomId?: string | null
    status?: 'Active' | 'Inactive'
}

export interface UpdateEmployeeData extends Partial<CreateEmployeeData> {}

export interface EmployeeFilters {
    employeeType?: 'Permanent' | 'Temporary' | 'Visitor'
    department?: string
    campId?: string
    status?: 'Active' | 'Inactive'
    page?: number
    limit?: number
}

const API_BASE_URL =
    import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'

/**
 * Get all employees with optional filters
 */
export const getEmployees = async (
    filters?: EmployeeFilters,
): Promise<{
    data: Employee[]
    total: number
    page: number
    limit: number
    totalPages: number
}> => {
    try {
        const queryParams = new URLSearchParams()
        if (filters?.employeeType)
            queryParams.append('employeeType', filters.employeeType)
        if (filters?.department)
            queryParams.append('department', filters.department)
        if (filters?.campId) queryParams.append('campId', filters.campId)
        if (filters?.status) queryParams.append('status', filters.status)
        if (filters?.page) queryParams.append('page', filters.page.toString())
        if (filters?.limit)
            queryParams.append('limit', filters.limit.toString())

        const url = `${API_BASE_URL}/api/employees${
            queryParams.toString() ? `?${queryParams.toString()}` : ''
        }`
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
            },
        })

        if (!response.ok) {
            throw new Error(`Failed to fetch employees: ${response.statusText}`)
        }

        const data = await response.json()
        return data
    } catch (error) {
        console.error('Error fetching employees:', error)
        throw error
    }
}

/**
 * Get employee by ID
 */
export const getEmployeeById = async (id: string): Promise<Employee> => {
    try {
        const response = await fetch(`${API_BASE_URL}/api/employees/${id}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
            },
        })

        if (!response.ok) {
            throw new Error(`Failed to fetch employee: ${response.statusText}`)
        }

        return await response.json()
    } catch (error) {
        console.error('Error fetching employee:', error)
        throw error
    }
}

/**
 * Create a new employee
 */
export const createEmployee = async (
    employeeData: CreateEmployeeData,
): Promise<Employee> => {
    try {
        const response = await fetch(`${API_BASE_URL}/api/employees`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
            },
            body: JSON.stringify(employeeData),
        })

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}))
            throw new Error(errorData.message || 'Failed to create employee')
        }

        return await response.json()
    } catch (error) {
        console.error('Error creating employee:', error)
        throw error
    }
}

/**
 * Update an existing employee
 */
export const updateEmployee = async (
    id: string,
    updates: UpdateEmployeeData,
): Promise<Employee> => {
    try {
        const response = await fetch(`${API_BASE_URL}/api/employees/${id}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
            },
            body: JSON.stringify(updates),
        })

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}))
            throw new Error(errorData.message || 'Failed to update employee')
        }

        return await response.json()
    } catch (error) {
        console.error('Error updating employee:', error)
        throw error
    }
}

/**
 * Delete (soft delete) an employee by ID
 */
export const deleteEmployee = async (id: string): Promise<void> => {
    try {
        const response = await fetch(`${API_BASE_URL}/api/employees/${id}`, {
            method: 'DELETE',
            headers: {
                Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
            },
        })

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}))
            throw new Error(errorData.message || 'Failed to delete employee')
        }
    } catch (error) {
        console.error('Error deleting employee:', error)
        throw error
    }
}
