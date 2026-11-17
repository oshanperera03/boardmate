import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
  type DocumentData,
} from 'firebase/firestore'
import { auth, db } from '../firebase/config'
import type { PropertyDocument } from '../../types/property'
import type { RoomAvailabilityStatus, RoomDocument, RoomInput } from '../../types/room'

const roomsCollection = collection(db, 'rooms')

function toRoom(entry: DocumentData, id?: string): RoomDocument {
  return { id: id ?? entry.id, ...(entry as RoomDocument) }
}

function getCurrentOwnerId(): string {
  const uid = auth.currentUser?.uid
  if (!uid) throw new Error('You must be signed in to manage rooms.')
  return uid
}

export function calculateAvailableSpaces(maximumOccupants: number, currentOccupants: number): number {
  return maximumOccupants - currentOccupants
}

export function calculateAvailabilityStatus(
  maximumOccupants: number,
  currentOccupants: number,
  temporarilyUnavailable = false,
): RoomAvailabilityStatus {
  if (temporarilyUnavailable) return 'temporarily_unavailable'
  const availableSpaces = calculateAvailableSpaces(maximumOccupants, currentOccupants)
  if (availableSpaces === 0) return 'occupied'
  return currentOccupants === 0 ? 'available' : 'partially_available'
}

function validateRoomInput(input: RoomInput): void {
  if (!input.propertyId.trim()) throw new Error('Select a boarding property.')
  if (!input.roomName.trim()) throw new Error('Enter a room name or number.')
  if (!Number.isInteger(input.maximumOccupants) || input.maximumOccupants < 1) throw new Error('Maximum occupants must be at least 1.')
  if (!Number.isInteger(input.currentOccupants) || input.currentOccupants < 0 || input.currentOccupants > input.maximumOccupants) {
    throw new Error('Current occupants must be between 0 and the maximum capacity.')
  }
  if (input.monthlyPrice < 0 || input.advancePayment < 0 || input.additionalCharges < 0) {
    throw new Error('Prices cannot be negative.')
  }
}

async function assertOwnedProperty(propertyId: string, ownerId: string): Promise<PropertyDocument> {
  const propertySnapshot = await getDoc(doc(db, 'properties', propertyId))
  if (!propertySnapshot.exists()) throw new Error('The selected property could not be found.')
  const property = propertySnapshot.data() as PropertyDocument
  if (property.ownerId !== ownerId) throw new Error('You can only manage rooms for your own properties.')
  return { id: propertySnapshot.id, ...property }
}

export async function getOwnerRooms(ownerId = getCurrentOwnerId()): Promise<RoomDocument[]> {
  const snapshot = await getDocs(query(roomsCollection, where('ownerId', '==', ownerId)))
  return snapshot.docs
    .map((entry) => toRoom(entry.data(), entry.id))
    .sort((first, second) => (second.createdAt?.toMillis() ?? 0) - (first.createdAt?.toMillis() ?? 0))
}

export async function getOwnerRoom(roomId: string, ownerId = getCurrentOwnerId()): Promise<RoomDocument | null> {
  const snapshot = await getDoc(doc(db, 'rooms', roomId))
  if (!snapshot.exists()) return null
  const room = toRoom(snapshot.data(), snapshot.id)
  return room.ownerId === ownerId ? room : null
}

export async function createRoom(input: RoomInput): Promise<string> {
  const ownerId = getCurrentOwnerId()
  validateRoomInput(input)
  await assertOwnedProperty(input.propertyId, ownerId)
  const availableSpaces = calculateAvailableSpaces(input.maximumOccupants, input.currentOccupants)
  const payload = {
    ...input,
    ownerId,
    availableSpaces,
    availabilityStatus: calculateAvailabilityStatus(input.maximumOccupants, input.currentOccupants),
    isActive: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }
  const room = await addDoc(roomsCollection, payload)
  return room.id
}

export async function updateRoom(roomId: string, input: RoomInput, temporarilyUnavailable = false): Promise<void> {
  const ownerId = getCurrentOwnerId()
  validateRoomInput(input)
  await assertOwnedProperty(input.propertyId, ownerId)
  const existing = await getOwnerRoom(roomId, ownerId)
  if (!existing) throw new Error('Room not found or you do not have permission to edit it.')
  await updateDoc(doc(db, 'rooms', roomId), {
    ...input,
    ownerId,
    availableSpaces: calculateAvailableSpaces(input.maximumOccupants, input.currentOccupants),
    availabilityStatus: calculateAvailabilityStatus(input.maximumOccupants, input.currentOccupants, temporarilyUnavailable),
    updatedAt: serverTimestamp(),
  })
}

export async function updateRoomAvailability(roomId: string, status: RoomAvailabilityStatus): Promise<void> {
  const ownerId = getCurrentOwnerId()
  const room = await getOwnerRoom(roomId, ownerId)
  if (!room) throw new Error('Room not found or you do not have permission to edit it.')
  if (status !== 'temporarily_unavailable' && status !== calculateAvailabilityStatus(room.maximumOccupants, room.currentOccupants)) {
    throw new Error('This availability status does not match the room occupancy.')
  }
  await updateDoc(doc(db, 'rooms', roomId), { availabilityStatus: status, updatedAt: serverTimestamp() })
}

export async function deleteRoom(roomId: string): Promise<void> {
  const ownerId = getCurrentOwnerId()
  const room = await getOwnerRoom(roomId, ownerId)
  if (!room) throw new Error('Room not found or you do not have permission to delete it.')
  if (room.currentOccupants > 0) throw new Error('Rooms with occupants cannot be deleted.')
  await deleteDoc(doc(db, 'rooms', roomId))
}
