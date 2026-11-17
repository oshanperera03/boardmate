import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  type DocumentData,
} from 'firebase/firestore'
import { db } from '../firebase/config'
import type { PropertyDocument } from '../../types/property'
import type { RoomDocument } from '../../types/room'

const propertiesCollection = collection(db, 'properties')
const roomsCollection = collection(db, 'rooms')

function toProperty(entry: DocumentData, id?: string): PropertyDocument {
  return { id: id ?? entry.id, ...(entry as PropertyDocument) }
}

function toRoom(entry: DocumentData, id?: string): RoomDocument {
  return { id: id ?? entry.id, ...(entry as RoomDocument) }
}

export async function getDiscoverableProperties(): Promise<PropertyDocument[]> {
  const snapshot = await getDocs(query(propertiesCollection, where('approvalStatus', '==', 'approved')))
  return snapshot.docs.map((entry) => toProperty(entry.data(), entry.id))
}

export async function getAvailableRooms(): Promise<RoomDocument[]> {
  const snapshot = await getDocs(query(roomsCollection, where('availableSpaces', '>', 0)))
  return snapshot.docs
    .map((entry) => toRoom(entry.data(), entry.id))
    .filter((room) => room.isActive && room.availableSpaces > 0 && ['available', 'partially_available'].includes(room.availabilityStatus))
}

export async function getDiscoverableProperty(propertyId: string): Promise<PropertyDocument | null> {
  const snapshot = await getDoc(doc(db, 'properties', propertyId))
  if (!snapshot.exists()) return null
  const property = toProperty(snapshot.data(), snapshot.id)
  return property.approvalStatus === 'approved' ? property : null
}

export async function getAvailableRoomsForProperty(propertyId: string): Promise<RoomDocument[]> {
  const rooms = await getAvailableRooms()
  return rooms.filter((room) => room.propertyId === propertyId)
}
