import type { Timestamp } from 'firebase/firestore'

export interface PropertyReview {
  id: string
  propertyId: string
  studentId: string
  studentName: string
  bookingId: string
  rating: number
  comment: string
  createdAt: Timestamp | null
  updatedAt: Timestamp | null
}
