import type { Timestamp } from 'firebase/firestore'

export type BookingStatus = 'pending' | 'accepted' | 'rejected' | 'cancelled' | 'expired' | 'completed'

export interface BookingDocument {
  id?: string
  bookingId: string
  studentId: string
  ownerId: string
  propertyId: string
  roomId: string
  studentName: string
  studentEmail: string
  studentPhone: string
  numberOfOccupants: number
  moveInDate: string
  expectedDuration: string
  studentMessage: string
  bookingStatus: BookingStatus
  rejectionReason: string | null
  createdAt: Timestamp | null
  updatedAt: Timestamp | null
}

export interface NotificationDocument {
  id?: string
  userId: string
  title: string
  message: string
  type: string
  relatedBookingId: string
  isRead: boolean
  createdAt: Timestamp | null
}
