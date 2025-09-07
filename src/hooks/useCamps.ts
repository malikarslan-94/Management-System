import { useState, useEffect, useCallback } from 'react';
import { campApi } from '@/services/api';
import { toast } from '@/components/ui';

interface Camp {
  _id: string;
  name: string;
  location: string;
  description: string;
  price: number;
  image?: string;
  rating?: number;
}

export const useCamps = () => {
  const [camps, setCamps] = useState<Camp[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCamps = useCallback(async () => {
    try {
      setLoading(true);
      console.log('Fetching camps...');
      const response = await campApi.getAll();
      console.log('API Response:', response);
      // Ensure response.data is an array before setting it
      const campsData = Array.isArray(response?.data) ? response.data : [];
      console.log('Processed camps data:', campsData);
      setCamps(campsData);
      setError(null);
    } catch (err) {
      console.error('Error fetching camps:', err);
      setError('Failed to fetch camps');
      alert('Failed to load camps. Please try again.');
      setCamps([]); // Ensure camps is always an array
    } finally {
      setLoading(false);
    }
  }, []);

  const addCamp = async (campData: Omit<Camp, '_id'>) => {
    try {
      console.log('Adding new camp with data:', campData);
      const response = await campApi.create(campData);
      console.log('Camp API response:', response);
      
      if (!response || !response.data) {
        throw new Error('Invalid response from server');
      }
      
      setCamps(prev => {
        const updatedCamps = [...prev, response.data];
        console.log('Updated camps list:', updatedCamps);
        return updatedCamps;
      });
      
      alert('Camp added successfully');
      return response.data;
    } catch (err) {
      console.error('Error adding camp:', err);
      alert('Failed to add camp');
      throw err;
    }
  };

  const updateCamp = async (id: string, campData: Partial<Camp>) => {
    try {
      const response = await campApi.update(id, campData);
      setCamps(prevCamps => 
        prevCamps.map(camp => (camp._id === id ? response.data : camp))
      );
      alert('Camp updated successfully');
      return response.data;
    } catch (err) {
      console.error('Error updating camp:', err);
      alert('Failed to update camp');
      throw err;
    }
  };

  const deleteCamp = async (id: string) => {
    try {
      await campApi.delete(id);
      setCamps(prev => prev.filter(camp => camp._id !== id));
      alert('Camp deleted successfully');
    } catch (err) {
      console.error('Error deleting camp:', err);
      alert('Failed to delete camp');
      throw err;
    }
  };

  useEffect(() => {
    fetchCamps();
  }, []);

  return {
    camps,
    loading,
    error,
    addCamp,
    updateCamp,
    deleteCamp,
    refreshCamps: fetchCamps,
  };
};

export default useCamps;
