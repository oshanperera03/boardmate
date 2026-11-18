import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  type DocumentData,
} from 'firebase/firestore'
import { auth, db } from '../firebase/config'
import type { PropertyDocument } from '../../types/property'
import type { RoomDocument } from '../../types/room'
import type { FeaturedListingDocument } from '../../types/featuredListing'

const featuredListingsCollection = collection(db, 'featuredListings')
const featuredListingDurationMs = 30 * 24 * 60 * 60 * 1000

function toFeaturedListing(entry: DocumentData, id?: string): FeaturedListingDocument {
  return { id: id ?? entry.id, ...(entry as FeaturedListingDocument) }
}

function getCurrentOwnerId(): string {
  const uid = auth.currentUser?.uid
  if (!uid) throw new Error('You must be signed in to promote a room.')
  return uid
}

export async function getOwnerFeaturedListings(ownerId = getCurrentOwnerId()): Promise<FeaturedListingDocument[]> {
  const snapshot = await getDocs(query(featuredListingsCollection, where('ownerId', '==', ownerId)))
  return snapshot.docs.map((entry) => toFeaturedListing(entry.data(), entry.id))
}

export async function getPendingFeaturedListings(): Promise<FeaturedListingDocument[]> {
  const snapshot = await getDocs(query(featuredListingsCollection, where('status', '==', 'pending')))
  return snapshot.docs.map((entry) => toFeaturedListing(entry.data(), entry.id))
}

export async function getFeaturedRoomIds(): Promise<string[]> {
  const snapshot = await getDocs(query(featuredListingsCollection, where('status', '==', 'approved')))
  const now = Date.now()
  return snapshot.docs
    .map((entry) => toFeaturedListing(entry.data(), entry.id))
    .filter((listing) => listing.expiresAt !== null && listing.expiresAt.toMillis() > now)
    .map((listing) => listing.roomId)
}

export async function markFeaturedListingPaid(roomId: string): Promise<void> {
  const ownerId = getCurrentOwnerId()
  const roomSnapshot = await getDoc(doc(db, 'rooms', roomId))
  if (!roomSnapshot.exists()) throw new Error('The selected room could not be found.')
  const room = { id: roomSnapshot.id, ...roomSnapshot.data() } as RoomDocument
  if (room.ownerId !== ownerId) throw new Error('You can only promote rooms you own.')
  if (!room.isActive || room.availableSpaces < 1) throw new Error('Only active rooms with available spaces can be promoted.')

  const propertySnapshot = await getDoc(doc(db, 'properties', room.propertyId))
  if (!propertySnapshot.exists()) throw new Error('The room’s boarding property could not be found.')
  const property = propertySnapshot.data() as PropertyDocument
  if (property.ownerId !== ownerId || property.approvalStatus !== 'approved') {
    throw new Error('Only rooms on your approved boarding properties can be promoted.')
  }

  const listingRef = doc(featuredListingsCollection, roomId)
  const listingSnapshot = await getDoc(listingRef)
  if (listingSnapshot.exists()) {
    const existing = toFeaturedListing(listingSnapshot.data(), listingSnapshot.id)
    if (existing.ownerId !== ownerId) throw new Error('You can only promote rooms you own.')
    if (existing.status === 'pending') throw new Error('This room’s payment is already awaiting administrator review.')
    if (existing.status === 'approved' && (existing.expiresAt?.toMillis() ?? 0) > Date.now()) {
      throw new Error('This room already has an active Pro listing.')
    }
  }

  const request = {
    roomId,
    propertyId: room.propertyId,
    ownerId,
    status: 'pending',
    paymentMarkedAt: serverTimestamp(),
    approvedAt: null,
    expiresAt: null,
    rejectionReason: null,
  }
  if (listingSnapshot.exists()) {
    await updateDoc(listingRef, request)
  } else {
    await setDoc(listingRef, request)
  }
}

export async function reviewFeaturedListing(
  roomId: string,
  decision: 'approve' | 'reject',
): Promise<void> {
  const request = decision === 'approve'
    ? {
        status: 'approved',
        approvedAt: serverTimestamp(),
        expiresAt: Timestamp.fromMillis(Date.now() + featuredListingDurationMs),
        rejectionReason: null,
      }
    : {
        status: 'rejected',
        approvedAt: null,
        expiresAt: null,
        rejectionReason: 'Payment was not approved. Please check with the administrator before paying again.',
      }

  await updateDoc(doc(featuredListingsCollection, roomId), request)
}
