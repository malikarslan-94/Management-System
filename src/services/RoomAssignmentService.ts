export interface OccupantDetails {
  _id: string
  firstName: string
  lastName: string
  email: string
  phone: string
  department?: string
  designation?: string
}

export interface RoomDetails {
  _id: string
  roomNumber: string
  type: string
  capacity: number
  price: number
  amenities: string[]
  camp?: {
    _id: string
    name: string
    location: string
  }
}

export interface RoomAssignment {
  _id?: string
  roomId: string | RoomDetails
  occupantId: string
  occupantType: 'Employee' | 'Temporary Visitor'
  startDate: string // ISO date string
  expectedCheckoutDate: string // ISO date string
  checkInTime?: string // ISO datetime string
  checkOutTime?: string | null // ISO datetime string
  status: 'active' | 'completed' | 'cancelled'
  createdAt?: string
  updatedAt?: string
  occupantDetails?: OccupantDetails | null
  roomId_details?: RoomDetails
}

export interface AssignRoomPayload {
  roomId: string
  occupantId: string
  occupantType: 'Employee' | 'Temporary Visitor'
  startDate: string
  expectedCheckoutDate: string
}

export interface CheckoutRoomPayload {
  assignmentId: string
  checkOutTime?: string
}

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'

/**
 * Assign a room to an occupant
 */
export const assignRoom = async (
  payload: AssignRoomPayload,
): Promise<RoomAssignment> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/assignments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.message || 'Failed to assign room')
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error('Error assigning room:', error)
    throw error
  }
}

/**
 * Checkout from a room assignment
 */
export const checkoutRoom = async (
  payload: CheckoutRoomPayload,
): Promise<RoomAssignment> => {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/assignments/${payload.assignmentId}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
        },
        body: JSON.stringify({
          checkOutTime: payload.checkOutTime || new Date().toISOString(),
          status: 'completed',
        }),
      },
    )

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.message || 'Failed to checkout room')
    }

    return await response.json()
  } catch (error) {
    console.error('Error checking out room:', error)
    throw error
  }
}

export interface AssignmentFilters {
  roomId?: string
  occupantId?: string
  status?: 'active' | 'completed' | 'cancelled'
  page?: number
  limit?: number
}

export interface AssignmentResponse {
  data: RoomAssignment[]
  total: number
  page: number
  limit: number
  totalPages: number
}

/**
 * Get room assignments with optional filters
 */
export const getRoomAssignments = async (
  filters?: AssignmentFilters,
): Promise<AssignmentResponse> => {
  try {
    const queryParams = new URLSearchParams()
    if (filters?.roomId) queryParams.append('roomId', filters.roomId)
    if (filters?.occupantId) queryParams.append('occupantId', filters.occupantId)
    if (filters?.status) queryParams.append('status', filters.status)
    if (filters?.page) queryParams.append('page', filters.page.toString())
    if (filters?.limit) queryParams.append('limit', filters.limit.toString())

    const url = `${API_BASE_URL}/api/assignments${
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
      throw new Error(`Failed to fetch assignments: ${response.statusText}`)
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error('Error fetching assignments:', error)
    throw error
  }
}


