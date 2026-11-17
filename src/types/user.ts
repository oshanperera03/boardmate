import type { Timestamp } from 'firebase/firestore'

export type UserRole = 'student' | 'owner' | 'admin'
export type ApprovalStatus = 'not_required' | 'pending' | 'approved' | 'rejected'
export type AccountStatus = 'active' | 'suspended'

export interface UserProfile {
  uid: string
  fullName: string
  email: string
  phoneNumber: string
  role: UserRole
  approvalStatus: ApprovalStatus
  accountStatus: AccountStatus
  rejectionReason?: string
  createdAt: Timestamp
  updatedAt: Timestamp
}

export interface RegistrationInput {
  fullName: string
  email: string
  phoneNumber: string
  password: string
  role: 'student' | 'owner'
}
