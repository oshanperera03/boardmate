import { collection, doc, getDocs, onSnapshot, orderBy, query, runTransaction, serverTimestamp, updateDoc, where, type DocumentData, type Unsubscribe } from 'firebase/firestore'
import { auth, db } from '../firebase/config'
import type { BookingDocument, NotificationDocument } from '../../types/booking'

const bookingsCollection = collection(db, 'bookings')
const notificationsCollection = collection(db, 'notifications')

function toBooking(entry: DocumentData, id: string): BookingDocument {
  return { id, ...(entry as BookingDocument) }
}

function toNotification(entry: DocumentData, id: string): NotificationDocument {
  return { id, ...(entry as NotificationDocument) }
}

export async function submitBookingRequest(input: {
  propertyId: string
  roomId: string
  studentPhone: string
  moveInDate: string
  expectedDuration: string
  numberOfOccupants: number
  studentMessage: string
}) {
  const studentId = auth.currentUser?.uid
  if (!studentId) throw new Error('Please sign in again.')

  let bookingId = ''
  await runTransaction(db, async (transaction) => {
    const [studentSnapshot, propertySnapshot, roomSnapshot] = await Promise.all([
      transaction.get(doc(db, 'users', studentId)),
      transaction.get(doc(db, 'properties', input.propertyId)),
      transaction.get(doc(db, 'rooms', input.roomId)),
    ])
    if (!studentSnapshot.exists() || studentSnapshot.data().role !== 'student') {
      throw new Error('Only active student accounts can submit booking requests.')
    }
    if (!propertySnapshot.exists() || propertySnapshot.data().approvalStatus !== 'approved') {
      throw new Error('This property is not approved.')
    }
    const property = propertySnapshot.data()
    if (!roomSnapshot.exists()) {
      throw new Error('This room is not active.')
    }
    const room = roomSnapshot.data()
    if (roomSnapshot.id !== input.roomId || room.isActive !== true) {
      throw new Error('This room is not active.')
    }
    if (room.propertyId !== input.propertyId || room.ownerId !== property.ownerId) {
      throw new Error('This room does not belong to the selected property.')
    }
    const availableSpaces = Number(room.availableSpaces)
    if (!Number.isInteger(availableSpaces) || availableSpaces < 1
      || room.availabilityStatus === 'temporarily_unavailable'
      || room.availabilityStatus === 'occupied'
      || input.numberOfOccupants < 1
      || input.numberOfOccupants > availableSpaces) {
      throw new Error(`The room has ${availableSpaces} available space(s).`)
    }

    const bookingRef = doc(bookingsCollection)
    bookingId = bookingRef.id
    transaction.set(bookingRef, {
      bookingId: bookingRef.id,
      studentId,
      ownerId: property.ownerId,
      propertyId: input.propertyId,
      roomId: input.roomId,
      studentName: studentSnapshot.data().fullName || '',
      studentEmail: studentSnapshot.data().email || '',
      studentPhone: input.studentPhone.trim(),
      numberOfOccupants: input.numberOfOccupants,
      moveInDate: input.moveInDate,
      expectedDuration: input.expectedDuration.trim(),
      studentMessage: input.studentMessage.trim(),
      bookingStatus: 'pending',
      rejectionReason: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
  })
  return { success: true, bookingId }
}

export async function acceptBooking(bookingId: string) {
  const ownerId = auth.currentUser?.uid
  if (!ownerId) throw new Error('Please sign in again.')
  await runTransaction(db, async (transaction) => {
    const bookingRef = doc(db, 'bookings', bookingId)
    const bookingSnapshot = await transaction.get(bookingRef)
    if (!bookingSnapshot.exists()) throw new Error('Booking not found.')
    const booking = bookingSnapshot.data()
    if (booking.ownerId !== ownerId) throw new Error('This booking belongs to another owner.')
    if (booking.bookingStatus !== 'pending') throw new Error('This booking is no longer pending.')

    const [ownerSnapshot, propertySnapshot, roomSnapshot] = await Promise.all([
      transaction.get(doc(db, 'users', ownerId)),
      transaction.get(doc(db, 'properties', booking.propertyId)),
      transaction.get(doc(db, 'rooms', booking.roomId)),
    ])
    if (!ownerSnapshot.exists()
      || ownerSnapshot.data().role !== 'owner'
      || ownerSnapshot.data().approvalStatus !== 'approved'
      || ownerSnapshot.data().accountStatus !== 'active') {
      throw new Error('The owner account cannot manage bookings.')
    }
    if (!propertySnapshot.exists() || propertySnapshot.data().ownerId !== ownerId) {
      throw new Error('This property belongs to another owner.')
    }
    if (!roomSnapshot.exists()
      || roomSnapshot.data().ownerId !== ownerId
      || roomSnapshot.data().propertyId !== booking.propertyId
      || roomSnapshot.data().isActive !== true
      || roomSnapshot.data().availabilityStatus === 'temporarily_unavailable') {
      throw new Error('The room is no longer available.')
    }
    const room = roomSnapshot.data()
    const requested = Number(booking.numberOfOccupants)
    const maximum = Number(room.maximumOccupants)
    const current = Number(room.currentOccupants)
    const available = Number(room.availableSpaces)
    if (!Number.isInteger(requested) || requested < 1 || requested > available) {
      throw new Error('The room no longer has enough available spaces.')
    }
    const newCurrent = current + requested
    const newAvailable = maximum - newCurrent
    if (newAvailable < 0) throw new Error('The room cannot exceed its capacity.')
    const roomStatus = newAvailable === 0 ? 'occupied' : newCurrent === 0 ? 'available' : 'partially_available'

    transaction.update(doc(db, 'rooms', booking.roomId), {
      currentOccupants: newCurrent,
      availableSpaces: newAvailable,
      availabilityStatus: roomStatus,
      updatedAt: serverTimestamp(),
    })
    transaction.update(bookingRef, {
      bookingStatus: 'accepted',
      rejectionReason: null,
      updatedAt: serverTimestamp(),
    })
  })
}

export async function rejectBooking(bookingId: string, reason = '') {
  const ownerId = auth.currentUser?.uid
  if (!ownerId) throw new Error('Please sign in again.')
  if (reason.length > 1000) throw new Error('The rejection reason is too long.')
  await runTransaction(db, async (transaction) => {
    const bookingRef = doc(db, 'bookings', bookingId)
    const bookingSnapshot = await transaction.get(bookingRef)
    if (!bookingSnapshot.exists()) throw new Error('Booking not found.')
    if (bookingSnapshot.data().ownerId !== ownerId) throw new Error('This booking belongs to another owner.')
    if (bookingSnapshot.data().bookingStatus !== 'pending') throw new Error('This booking is no longer pending.')
    transaction.update(bookingRef, {
      bookingStatus: 'rejected',
      rejectionReason: reason.trim() || null,
      updatedAt: serverTimestamp(),
    })
  })
}

export async function cancelBooking(bookingId: string) {
  const studentId = auth.currentUser?.uid
  if (!studentId) throw new Error('Please sign in again.')
  await runTransaction(db, async (transaction) => {
    const bookingRef = doc(db, 'bookings', bookingId)
    const bookingSnapshot = await transaction.get(bookingRef)
    if (!bookingSnapshot.exists()) throw new Error('Booking not found.')
    if (bookingSnapshot.data().studentId !== studentId) throw new Error('This booking belongs to another student.')
    if (bookingSnapshot.data().bookingStatus !== 'pending') throw new Error('Only pending requests can be cancelled.')
    transaction.update(bookingRef, { bookingStatus: 'cancelled', updatedAt: serverTimestamp() })
  })
}

export async function expireBooking(bookingId: string) {
  const ownerId = auth.currentUser?.uid
  if (!ownerId) throw new Error('Please sign in again.')
  await runTransaction(db, async (transaction) => {
    const bookingRef = doc(db, 'bookings', bookingId)
    const bookingSnapshot = await transaction.get(bookingRef)
    if (!bookingSnapshot.exists()) throw new Error('Booking not found.')
    if (bookingSnapshot.data().ownerId !== ownerId) throw new Error('This booking belongs to another owner.')
    if (bookingSnapshot.data().bookingStatus !== 'pending') throw new Error('Only pending requests can expire.')
    transaction.update(bookingRef, { bookingStatus: 'expired', updatedAt: serverTimestamp() })
  })
}

export async function getStudentBookings(studentId: string): Promise<BookingDocument[]> {
  const snapshot = await getDocs(query(bookingsCollection, where('studentId', '==', studentId)))
  return snapshot.docs
    .map((entry) => toBooking(entry.data(), entry.id))
    .sort((first, second) => (second.createdAt?.toMillis() ?? 0) - (first.createdAt?.toMillis() ?? 0))
}

export async function getOwnerBookings(ownerId: string): Promise<BookingDocument[]> {
  const snapshot = await getDocs(query(bookingsCollection, where('ownerId', '==', ownerId)))
  return snapshot.docs
    .map((entry) => toBooking(entry.data(), entry.id))
    .sort((first, second) => (second.createdAt?.toMillis() ?? 0) - (first.createdAt?.toMillis() ?? 0))
}

export function subscribeToNotifications(userId: string, callback: (items: NotificationDocument[]) => void): Unsubscribe {
  const notificationQuery = query(notificationsCollection, where('userId', '==', userId), orderBy('createdAt', 'desc'))
  return onSnapshot(notificationQuery, (snapshot) => {
    callback(snapshot.docs.map((entry) => toNotification(entry.data(), entry.id)))
  })
}

export async function markNotificationRead(notificationId: string) {
  await updateDoc(doc(db, 'notifications', notificationId), { isRead: true })
}
