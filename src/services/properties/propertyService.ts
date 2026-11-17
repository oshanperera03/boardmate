import {
  addDoc,
  collection,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
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
    query(propertiesCollection, where('ownerId', '==', ownerId), orderBy('createdAt', 'desc')),
  )

  return snapshot.docs.map((entry) => toProperty(entry.data(), entry.id))
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
