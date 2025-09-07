export type RoomStatus = 'available' | 'occupied' | 'maintenance' | 'cleaning';
export type RoomType = 'single' | 'double' | 'dormitory' | 'suite';

export interface Room {
  id: string;
  campId: string;
  roomNumber: string;
  type: 'single' | 'double' | 'dormitory' | 'suite';
  capacity: number;
  status: 'available' | 'occupied' | 'maintenance' | 'cleaning';
  pricePerNight: number;
  amenities: string[];
}

const API_BASE_URL = 'http://localhost:5000/api'; // Update with your actual API URL

/**
 * Get all rooms, optionally filtered by campId
 */
export const getRooms = async (campId?: string): Promise<Room[]> => {
  try {
    const url = campId ? `${API_BASE_URL}/rooms?campId=${campId}` : `${API_BASE_URL}/rooms`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch rooms: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching rooms:', error);
    throw error;
  }
};

/**
 * Create a new room
 */
export const createRoom = async (room: Omit<Room, 'id'>): Promise<Room> => {
  try {
    const response = await fetch(`${API_BASE_URL}/rooms`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
      },
      body: JSON.stringify(room)
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Failed to create room');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error creating room:', error);
    throw error;
  }
};

/**
 * Update an existing room
 */
export const updateRoom = async (id: string, updates: Partial<Room>): Promise<Room> => {
  try {
    const response = await fetch(`${API_BASE_URL}/rooms/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
      },
      body: JSON.stringify(updates)
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Failed to update room');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error updating room:', error);
    throw error;
  }
};

/**
 * Delete a room by ID
 */
export const deleteRoom = async (id: string): Promise<void> => {
  try {
    const response = await fetch(`${API_BASE_URL}/rooms/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
      }
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Failed to delete room');
    }
  } catch (error) {
    console.error('Error deleting room:', error);
    throw error;
  }
};
