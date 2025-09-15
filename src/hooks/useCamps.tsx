import { useState, useEffect, useCallback } from 'react';
import { campApi } from '@/services/api';
import { toast, Notification } from '@/components/ui';

interface Camp {
  _id?: string;
  name: string;
  location: string;
  description?: string;
  price?: number;
  image?: string;
  rating?: number;
  status?: 'active' | 'inactive';
  totalRooms?: number;
  occupiedRooms?: number;
}

export const useCamps = () => {
  const [camps, setCamps] = useState<Camp[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCamps = useCallback(async () => {
    try {
      setLoading(true);
      const response = await campApi.getAll();
      console.log('API Response:', response);

      const campsData = Array.isArray(response?.data?.data) ? response.data.data : [];
      setCamps(campsData);
      setError(null);
    } catch (err) {
      console.error('Error fetching camps:', err);
      setError('Failed to fetch camps');
      setCamps([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const addCamp = async (campData: Omit<Camp, '_id'>) => {
    try {
      const campWithDefaults: Camp = {
        name: campData.name || 'Unnamed Camp',
        location: campData.location || 'Unknown Location',
        description: campData.description || 'No description provided',
        price: campData.price ?? 0,
        status: campData.status || 'active',
        totalRooms: campData.totalRooms ?? 0,
        occupiedRooms: campData.occupiedRooms ?? 0,
        image: campData.image,
        rating: campData.rating,
      };

      const response = await campApi.create(campWithDefaults);

      if (!response || !response.data) {
        throw new Error('Invalid response from server');
      }

      setCamps(prev => [...prev, response.data]);
      toast.push(
        <Notification title="Success" type="success">
          Camp added successfully!
        </Notification>
      );

      return response.data;
    } catch (err) {
      console.error('Error adding camp:', err);
      toast.push(
        <Notification title="Error" type="danger">
          Failed to add camp
        </Notification>
      );
      throw err;
    }
  };

  const updateCamp = async (id: string, campData: Partial<Camp>) => {
    try {
      const response = await campApi.update(id, campData);
      setCamps(prevCamps =>
        prevCamps.map(camp => (camp._id === id ? response.data : camp))
      );

      toast.push(
        <Notification title="Success" type="success">
          Camp updated successfully!
        </Notification>
      );

      return response.data;
    } catch (err) {
      console.error('Error updating camp:', err);
      toast.push(
        <Notification title="Error" type="danger">
          Failed to update camp
        </Notification>
      );
      throw err;
    }
  };

  const deleteCamp = async (id: string) => {
    try {
      await campApi.delete(id);
      setCamps(prev => prev.filter(camp => camp._id !== id));

      toast.push(
        <Notification title="Success" type="success">
          Camp deleted successfully!
        </Notification>
      );
    } catch (err) {
      console.error('Error deleting camp:', err);
      toast.push(
        <Notification title="Error" type="danger">
          Failed to delete camp
        </Notification>
      );
      throw err;
    }
  };

  useEffect(() => {
    fetchCamps();
  }, [fetchCamps]);

  return {
    camps,
    loading,
    error,
    addCamp,
    updateCamp,
    deleteCamp,
    fetchCamps,
  };
};

export default useCamps;
