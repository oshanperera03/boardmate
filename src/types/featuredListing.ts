import type { Timestamp } from 'firebase/firestore'

export type FeaturedListingStatus = 'pending' | 'approved' | 'rejected'

export interface FeaturedListingDocument {
  id?: string
  roomId: string
  propertyId: string
  ownerId: string
  status: FeaturedListingStatus
  paymentMarkedAt: Timestamp | null
  approvedAt: Timestamp | null
  expiresAt: Timestamp | null
  rejectionReason: string | null
}
