export interface Location {
  id: string;
  name: string;
  address?: string;
  description?: string;
  image?: string;
  campCount?: number;
}

export interface LocationSummary extends Location {
  campCount: number;
}

export const getLocations = async (): Promise<LocationSummary[]> => {
  // TODO: Replace with real API
  return [
    { id: 'loc-1', name: 'Location A', address: 'North Zone', campCount: 2 },
    { id: 'loc-2', name: 'Location B', address: 'South Zone', campCount: 1 },
  ]
}

export const createLocation = async (loc: Omit<Location, 'id'>): Promise<Location> => {
  // TODO: Replace with real API
  return { ...loc, id: Math.random().toString() }
}

export const updateLocation = async (id: string, loc: Partial<Location>): Promise<Location> => {
  // TODO: Replace with real API
  return { id, name: loc.name ?? 'Updated Location', address: loc.address, description: loc.description, image: loc.image }
}

export const deleteLocation = async (id: string): Promise<void> => {
  // TODO: Replace with real API
  return Promise.resolve()
}
