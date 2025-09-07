export interface Camp {
  id: string;
  name: string;
  location: string;
  totalRooms: number;
  occupiedRooms: number;
  status: 'active' | 'inactive' | 'maintenance';
  description?: string;
  image?: string;
}

export const getCamps = async (): Promise<Camp[]> => {
  // TODO: Replace with actual API call
  return [
    {
      id: '1',
      name: 'Main Camp',
      location: 'Location A',
      totalRooms: 50,
      occupiedRooms: 35,
      status: 'active',
      description: 'Main accommodation area',
    }
  ];
};

export const createCamp = async (camp: Omit<Camp, 'id'>): Promise<Camp> => {
  // TODO: Replace with actual API call
  return {
    ...camp,
    id: Math.random().toString(),
    occupiedRooms: camp.occupiedRooms || 0
  };
};

export const updateCamp = async (id: string, camp: Partial<Camp>): Promise<Camp> => {
  // TODO: Replace with actual API call
  return { ...camp, id } as Camp;
};

export const deleteCamp = async (id: string): Promise<void> => {
  // TODO: Replace with actual API call
  return Promise.resolve();
};
