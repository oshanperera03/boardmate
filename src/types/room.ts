import type { Timestamp } from 'firebase/firestore'

export type RoomType = 'single' | 'double' | 'triple' | 'shared' | 'other'
export type RoomGenderPolicy = 'boys' | 'girls' | 'mixed'
export type SharingArrangement = 'private' | 'shared' | 'separate_beds' | 'other'
export type RoomAvailabilityStatus = 'available' | 'partially_available' | 'occupied' | 'temporarily_unavailable'
export type RoomFacility =
  | 'bed'
  | 'mattress'
  | 'wardrobe'
  | 'study_table'
  | 'chair'
  | 'air_conditioning'
  | 'fan'
  | 'attached_bathroom'
  | 'shared_bathroom'
  | 'wifi'
  | 'balcony'
  | 'other'

export interface RoomDocument {
  id?: string
  propertyId: string
  ownerId: string
  roomName: string
  roomType: RoomType
  monthlyPrice: number
  advancePayment: number
  additionalCharges: number
  utilitiesIncluded: boolean
  maximumOccupants: number
  currentOccupants: number
  availableSpaces: number
  genderPolicy: RoomGenderPolicy
  sharingArrangement: SharingArrangement
  facilities: RoomFacility[]
  availabilityStatus: RoomAvailabilityStatus
  isActive: boolean
  createdAt: Timestamp | null
  updatedAt: Timestamp | null
}

export type RoomInput = Omit<RoomDocument, 'id' | 'ownerId' | 'availableSpaces' | 'availabilityStatus' | 'createdAt' | 'updatedAt' | 'isActive'>
