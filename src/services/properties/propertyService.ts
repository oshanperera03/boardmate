import {
  addDoc,
  collection,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  doc,
  where,
  type DocumentData,
} from 'firebase/firestore'
import { db } from '../firebase/config'
import type { PropertyDocument, PropertyStats } from '../../types/property'

const propertiesCollection = collection(db, 'properties')

function toProperty(entry: DocumentData, id?: string): PropertyDocument {
  return { id: id ?? entry.id, ...(entry as PropertyDocument) }
}

export async function createProperty(property: Omit<PropertyDocument, 'id' | 'approvalStatus' | 'rejectionReason' | 'createdAt' | 'updatedAt'> & { ownerId: string }): Promise<string> {
  const payload = {
    ...property,
    approvalStatus: 'pending',
    rejectionReason: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }

  const docRef = await addDoc(propertiesCollection, payload)
  return docRef.id
}

export async function getOwnerProperties(ownerId: string): Promise<PropertyDocument[]> {
  const snapshot = await getDocs(
    query(propertiesCollection, where('ownerId', '==', ownerId)),
  )

  return snapshot.docs
    .map((entry) => toProperty(entry.data(), entry.id))
    .sort((first, second) => {
      const firstTime = first.createdAt?.toMillis() ?? 0
      const secondTime = second.createdAt?.toMillis() ?? 0
      return secondTime - firstTime
    })
}

export async function getOwnerPropertyStats(ownerId: string): Promise<PropertyStats> {
  const properties = await getOwnerProperties(ownerId)
  return {
    total: properties.length,
    pending: properties.filter((property) => property.approvalStatus === 'pending').length,
    approved: properties.filter((property) => property.approvalStatus === 'approved').length,
    rejected: properties.filter((property) => property.approvalStatus === 'rejected').length,
  }
}

export async function getPendingProperties(): Promise<PropertyDocument[]> {
  const snapshot = await getDocs(
    query(propertiesCollection, where('approvalStatus', '==', 'pending')),
  )

  return snapshot.docs.map((entry) => toProperty(entry.data(), entry.id))
}

export async function reviewProperty(
  propertyId: string,
  decision: 'approve' | 'reject',
  reason?: string,
): Promise<void> {
  const normalizedReason = reason?.trim()
  if (decision === 'reject' && !normalizedReason) {
    throw new Error('A reason is required when rejecting a property.')
  }
  if (normalizedReason && normalizedReason.length > 1000) {
    throw new Error('The rejection reason is too long.')
  }

  await updateDoc(doc(db, 'properties', propertyId), {
    approvalStatus: decision === 'approve' ? 'approved' : 'rejected',
    rejectionReason: decision === 'reject' ? normalizedReason : null,
    updatedAt: serverTimestamp(),
  })
}
