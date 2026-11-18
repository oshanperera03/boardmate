export interface BoardingListing {
  id: string
  name: string
  description: string
  address: string
  city: string
  district: string
  monthlyRent: number
  roomType: string
  availableRooms: number
  genderPreference: 'male' | 'female' | 'any'
  facilities: string[]
  contactPhone: string
}
