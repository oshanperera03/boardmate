import type { Timestamp } from 'firebase/firestore'

export type PropertyType = 'boarding_house' | 'annex' | 'hostel' | 'shared_accommodation' | 'apartment'
export type GenderPolicy = 'boys' | 'girls' | 'mixed'
export type RoomArrangement = 'separate_rooms' | 'mixed_rooms' | 'shared_rooms'
export type PropertyApprovalStatus = 'pending' | 'approved' | 'rejected'
export type PreferredContactMethod = 'phone' | 'whatsapp' | 'either'
export type FacilityOption =
  | 'wifi'
  | 'electricity'
  | 'water'
  | 'attached_bathroom'
  | 'shared_bathroom'
  | 'kitchen'
  | 'washing_machine'
  | 'parking'
  | 'cctv'
  | 'security'
  | 'air_conditioning'
  | 'furnished_rooms'
  | 'meals_provided'

export interface PropertyLocation {
  province: string
  district: string
  city: string
  address: string
  nearbyCampus: string
  mapLink: string
  latitude?: number
  longitude?: number
}

export interface PropertyContact {
  name: string
  phone: string
  whatsapp: string
  preferredMethod: PreferredContactMethod
}

export interface PropertyDocument {
  id?: string
  ownerId: string
  propertyName: string
  description: string
  propertyType: PropertyType
  location: PropertyLocation
  genderPolicy: GenderPolicy
  roomArrangement: RoomArrangement
  separateFloors: boolean
  separateRooms: boolean
  sharedBedroomsAllowed: boolean
  facilities: FacilityOption[]
  images: string[]
  contact: PropertyContact
  approvalStatus: PropertyApprovalStatus
  rejectionReason: string | null
  createdAt: Timestamp | null
  updatedAt: Timestamp | null
}

export interface PropertyStats {
  total: number
  pending: number
  approved: number
  rejected: number
}
