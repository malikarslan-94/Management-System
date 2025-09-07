export interface RoomFeature {
  id: string
  name: string
  icon: string
  description?: string
}

export interface RoomCategory {
  id: string
  name: string
  description: string
  basePrice: number
  image: string
  features: RoomFeature[]
  status: 'active' | 'inactive'
  roomCount: number
  availableCount: number
}

// Mock data - replace with actual API calls
export const getRoomCategories = async (): Promise<RoomCategory[]> => {
  // Simulate API call
  return [
    {
      id: 'standard',
      name: 'Standard Room',
      description: 'Comfortable standard accommodation with essential amenities',
      basePrice: 99,
      image: '/img/rooms/standard.jpg',
      status: 'active',
      roomCount: 25,
      availableCount: 15,
      features: [
        { id: 'wifi', name: 'Free WiFi', icon: 'wifi' },
        { id: 'ac', name: 'Air Conditioning', icon: 'snowflake' },
        { id: 'tv', name: 'Flat-screen TV', icon: 'tv' },
      ]
    },
    {
      id: 'deluxe',
      name: 'Deluxe Suite',
      description: 'Spacious suite with premium amenities and city view',
      basePrice: 199,
      image: '/img/rooms/deluxe.jpg',
      status: 'active',
      roomCount: 15,
      availableCount: 8,
      features: [
        { id: 'wifi', name: 'Free WiFi', icon: 'wifi' },
        { id: 'ac', name: 'Air Conditioning', icon: 'snowflake' },
        { id: 'tv', name: 'Smart TV', icon: 'tv' },
        { id: 'minibar', name: 'Minibar', icon: 'glass' },
        { id: 'view', name: 'City View', icon: 'mountain' },
      ]
    },
    {
      id: 'family',
      name: 'Family Room',
      description: 'Perfect for families with extra space and amenities',
      basePrice: 249,
      image: '/img/rooms/family.jpg',
      status: 'active',
      roomCount: 10,
      availableCount: 5,
      features: [
        { id: 'wifi', name: 'Free WiFi', icon: 'wifi' },
        { id: 'ac', name: 'Air Conditioning', icon: 'snowflake' },
        { id: 'tv', name: '2x Flat-screen TVs', icon: 'tv' },
        { id: 'bunk', name: 'Bunk Beds', icon: 'bed' },
        { id: 'kitchenette', name: 'Kitchenette', icon: 'utensils' },
      ]
    },
    {
      id: 'executive',
      name: 'Executive Suite',
      description: 'Luxury suite with premium services and amenities',
      basePrice: 349,
      image: '/img/rooms/executive.jpg',
      status: 'active',
      roomCount: 8,
      availableCount: 3,
      features: [
        { id: 'wifi', name: 'Premium WiFi', icon: 'wifi' },
        { id: 'ac', name: 'Climate Control', icon: 'thermometer' },
        { id: 'tv', name: '4K Smart TV', icon: 'tv' },
        { id: 'minibar', name: 'Premium Minibar', icon: 'glass' },
        { id: 'view', name: 'Panoramic View', icon: 'mountain' },
        { id: 'access', name: 'Executive Lounge', icon: 'key' },
      ]
    },
  ]
}

export const updateRoomCategory = async (id: string, updates: Partial<RoomCategory>): Promise<RoomCategory> => {
  // In a real app, this would be an API call
  const categories = await getRoomCategories()
  const index = categories.findIndex(c => c.id === id)
  if (index >= 0) {
    const updated = { ...categories[index], ...updates }
    return updated
  }
  throw new Error('Category not found')
}

export const getRoomCategory = async (id: string): Promise<RoomCategory | undefined> => {
  const categories = await getRoomCategories()
  return categories.find(c => c.id === id)
}
