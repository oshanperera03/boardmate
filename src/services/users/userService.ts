import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  type DocumentData,
} from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import { db, functions } from '../firebase/config'
import type { UserProfile } from '../../types/user'

const usersCollection = collection(db, 'users')

function toProfile(data: DocumentData): UserProfile {
  return data as UserProfile
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const snapshot = await getDoc(doc(db, 'users', uid))
  return snapshot.exists() ? toProfile(snapshot.data()) : null
}

export async function updateOwnProfile(
  uid: string,
  fullName: string,
  phoneNumber: string,
): Promise<void> {
  await updateDoc(doc(db, 'users', uid), {
    fullName,
    phoneNumber,
    updatedAt: serverTimestamp(),
  })
}

export async function getAllUsers(): Promise<UserProfile[]> {
  const snapshot = await getDocs(query(usersCollection, orderBy('createdAt', 'desc')))
  return snapshot.docs.map((entry) => toProfile(entry.data()))
}

export async function getPendingOwners(): Promise<UserProfile[]> {
  const snapshot = await getDocs(
    query(usersCollection, where('role', '==', 'owner'), where('approvalStatus', '==', 'pending')),
  )
  return snapshot.docs.map((entry) => toProfile(entry.data()))
}

export async function getOwners(status: 'approved' | 'rejected'): Promise<UserProfile[]> {
  const snapshot = await getDocs(
    query(usersCollection, where('role', '==', 'owner'), where('approvalStatus', '==', status)),
  )
  return snapshot.docs.map((entry) => toProfile(entry.data()))
}

export async function getOwner(uid: string): Promise<UserProfile | null> {
  const user = await getUserProfile(uid)
  return user?.role === 'owner' ? user : null
}

const reviewOwnerCall = httpsCallable<
  { uid: string; decision: 'approve' | 'reject'; reason?: string },
  { success: boolean }
>(functions, 'reviewOwner')

export async function reviewOwner(
  uid: string,
  decision: 'approve' | 'reject',
  reason?: string,
): Promise<void> {
  await reviewOwnerCall({ uid, decision, reason })
}

const suspendOwnerCall = httpsCallable<{ uid: string }, { success: boolean }>(
  functions,
  'suspendOwner',
)

export async function suspendOwner(uid: string): Promise<void> {
  await suspendOwnerCall({ uid })
}
