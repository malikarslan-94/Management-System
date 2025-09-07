import { useState, useEffect, useCallback } from 'react';
import { roomApi } from '@/services/api';
import { toast } from '@/components/ui';

interface Room {
  _id: string;
  camp: string;
  roomNumber: string;
  type: 'single' | 'double' | 'suite' | 'family';
  capacity: number;
  price: number;
  amenities: string[];
  isAvailable: boolean;
  images?: string[];
  description?: string;
}

export const useRooms = (campId?: string) => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRooms = useCallback(async () => {
    try {
      setLoading(true);
      const response = campId 
        ? await roomApi.getByCampId(campId)
        : await roomApi.getAll();
      setRooms(response.data);
      setError(null);
    } catch (err) {
      console.error('Error fetching rooms:', err);
      setError('Failed to fetch rooms');
      alert('Failed to load rooms. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [campId]);

  const addRoom = async (roomData: Omit<Room, '_id'>) => {
    try {
      const response = await roomApi.create(roomData);
      setRooms(prev => [...prev, response.data]);
      alert('Room added successfully');
      return response.data;
    } catch (err) {
      console.error('Error adding room:', err);
      alert('Failed to add room');
      throw err;
    }
  };

  const updateRoom = async (id: string, roomData: Partial<Room>) => {
    try {
      const response = await roomApi.update(id, roomData);
      setRooms(prev => 
        prev.map(room => (room._id === id ? response.data : room))
      );
      alert('Room updated successfully');
      return response.data;
    } catch (err) {
      console.error('Error updating room:', err);
      alert('Failed to update room');
      throw err;
    }
  };

  const deleteRoom = async (id: string) => {
    try {
      await roomApi.delete(id);
      setRooms(prev => prev.filter(room => room._id !== id));
      alert('Room deleted successfully');
    } catch (err) {
      console.error('Error deleting room:', err);
      alert('Failed to delete room');
      throw err;
    }
  };

  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  return {
    rooms,
    loading,
    error,
    addRoom,
    updateRoom,
    deleteRoom,
    refreshRooms: fetchRooms,
  };
};

export default useRooms;
