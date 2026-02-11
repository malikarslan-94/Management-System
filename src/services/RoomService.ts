import { roomApi } from './api'
import databaseConfig from '@/configs/database.config'

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

const API_BASE_URL = databaseConfig.apiBaseUrl || 'http://localhost:3001'

/**
 * Transform backend room data to frontend format
 */
const transformRoom = (backendRoom: any): Room | null => {
  try {
    // Skip invalid rooms
    if (!backendRoom || !backendRoom._id && !backendRoom.id) {
      console.warn('Skipping invalid room:', backendRoom);
      return null;
    }

    // Determine status from isAvailable boolean
    // isAvailable: true = available, isAvailable: false = occupied
    let status: RoomStatus = 'available';
    if (backendRoom.isAvailable === false) {
      status = 'occupied';
    } else if (backendRoom.isAvailable === true) {
      status = 'available';
    }
    // Default to available if isAvailable is undefined
    
    return {
      id: backendRoom._id || backendRoom.id,
      campId: typeof backendRoom.camp === 'object' && backendRoom.camp?._id 
        ? backendRoom.camp._id 
        : backendRoom.camp || backendRoom.campId || '',
      roomNumber: backendRoom.roomNumber || 'N/A',
      type: (backendRoom.type || 'single') as RoomType,
      capacity: backendRoom.capacity || 1,
      status: status,
      pricePerNight: backendRoom.price || backendRoom.pricePerNight || 0,
      amenities: Array.isArray(backendRoom.amenities) ? backendRoom.amenities : [],
    };
  } catch (error) {
    console.error('Error transforming room:', error, backendRoom);
    return null;
  }
};

/**
 * Get all rooms, optionally filtered by campId
 */
export const getRooms = async (campId?: string): Promise<Room[]> => {
  try {
    // Use roomApi which uses axios and has proper base URL
    const response = campId 
      ? await roomApi.getByCampId(campId)
      : await roomApi.getAll();
    
    console.log('Rooms API Response:', response);
    
    // Axios wraps response in .data
    let roomsData = response?.data;
    
    // Handle both direct array and wrapped response formats
    if (roomsData && typeof roomsData === 'object' && !Array.isArray(roomsData) && roomsData.data) {
      roomsData = roomsData.data;
    }
    
    // Ensure we have an array
    const rooms = Array.isArray(roomsData) ? roomsData : [];
    
    console.log('Raw rooms data:', rooms);
    console.log('Number of rooms from API:', rooms.length);
    
    // Transform backend data to frontend format
    // Filter out null values (rooms that failed transformation)
    const transformedRooms = rooms
      .map(transformRoom)
      .filter((room): room is Room => room !== null);
    
    console.log('Transformed rooms:', transformedRooms);
    console.log('Number of rooms after transformation:', transformedRooms.length);
    console.log('Rooms by status:', {
      available: transformedRooms.filter(r => r.status === 'available').length,
      occupied: transformedRooms.filter(r => r.status === 'occupied').length,
      maintenance: transformedRooms.filter(r => r.status === 'maintenance').length,
      cleaning: transformedRooms.filter(r => r.status === 'cleaning').length,
    });
    
    if (transformedRooms.length !== rooms.length) {
      console.warn(`Warning: ${rooms.length - transformedRooms.length} rooms were filtered out during transformation`);
    }
    
    return transformedRooms;
  } catch (error) {
    console.error('Error fetching rooms:', error);
    // Return empty array instead of throwing to prevent UI crash
    return [];
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
    // Transform frontend format to backend format
    const backendUpdates: any = { ...updates };
    
    // Map status to isAvailable
    if (updates.status !== undefined) {
      backendUpdates.isAvailable = updates.status === 'available';
      delete backendUpdates.status;
    }
    
    // Map pricePerNight to price
    if (updates.pricePerNight !== undefined) {
      backendUpdates.price = updates.pricePerNight;
      delete backendUpdates.pricePerNight;
    }
    
    // Map id to _id for backend
    if (backendUpdates.id) {
      backendUpdates._id = backendUpdates.id;
      delete backendUpdates.id;
    }
    
    // Map campId to camp
    if (backendUpdates.campId) {
      backendUpdates.camp = backendUpdates.campId;
      delete backendUpdates.campId;
    }
    
    // Use roomApi which uses axios
    const response = await roomApi.update(id, backendUpdates);
    
    const data = response?.data || response;
    return transformRoom(data);
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
