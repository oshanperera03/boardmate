const { initializeApp } = require('firebase-admin/app')
const { getAuth } = require('firebase-admin/auth')
const { getFirestore, FieldValue } = require('firebase-admin/firestore')
const { HttpsError, onCall } = require('firebase-functions/v2/https')

initializeApp()
const db = getFirestore()

function assertAdministrator(request) {
  if (!request.auth || request.auth.token.admin !== true) {
    throw new HttpsError('permission-denied', 'Administrator access is required.')
  }
}

exports.reviewOwner = onCall(async (request) => {
  assertAdministrator(request)
  const { uid, decision, reason } = request.data || {}
  if (typeof uid !== 'string' || !['approve', 'reject'].includes(decision)) {
    throw new HttpsError('invalid-argument', 'Provide a valid owner and decision.')
  }
  if (decision === 'reject' && (!reason || typeof reason !== 'string' || !reason.trim())) {
    throw new HttpsError('invalid-argument', 'A reason is required when rejecting an owner.')
  }
  if (typeof reason === 'string' && reason.length > 1000) {
    throw new HttpsError('invalid-argument', 'The rejection reason is too long.')
  }

  const ownerRef = db.collection('users').doc(uid)
  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ownerRef)
    if (!snapshot.exists || snapshot.get('role') !== 'owner') {
      throw new HttpsError('not-found', 'The owner account could not be found.')
    }
    if (snapshot.get('approvalStatus') !== 'pending') {
      throw new HttpsError('failed-precondition', 'This owner request has already been reviewed.')
    }
    const update = {
      approvalStatus: decision === 'approve' ? 'approved' : 'rejected',
      updatedAt: FieldValue.serverTimestamp(),
    }
    if (decision === 'reject') update.rejectionReason = reason.trim()
    else update.rejectionReason = FieldValue.delete()
    transaction.update(ownerRef, update)
  })

  return { success: true }
})

exports.suspendOwner = onCall(async (request) => {
  assertAdministrator(request)
  const { uid } = request.data || {}
  if (typeof uid !== 'string') {
    throw new HttpsError('invalid-argument', 'Provide a valid owner account.')
  }

  const ownerRef = db.collection('users').doc(uid)
  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ownerRef)
    if (!snapshot.exists || snapshot.get('role') !== 'owner') {
      throw new HttpsError('not-found', 'The owner account could not be found.')
    }
    transaction.update(ownerRef, {
      accountStatus: 'suspended',
      updatedAt: FieldValue.serverTimestamp(),
    })
  })
  await getAuth().revokeRefreshTokens(uid)
  return { success: true }
})

function assertActiveStudent(request) {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in to continue.')
  return request.auth.uid
}

function assertApprovedActiveOwner(request) {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in to continue.')
  return request.auth.uid
}

exports.submitBooking = onCall(async (request) => {
  const studentId = assertActiveStudent(request)
  const {
    propertyId,
    roomId,
    studentPhone,
    moveInDate,
    expectedDuration,
    numberOfOccupants,
    studentMessage,
  } = request.data || {}

  if (typeof propertyId !== 'string' || typeof roomId !== 'string'
    || typeof studentPhone !== 'string' || typeof moveInDate !== 'string'
    || typeof expectedDuration !== 'string'
    || !Number.isInteger(numberOfOccupants) || numberOfOccupants < 1
    || typeof studentMessage !== 'string') {
    throw new HttpsError('invalid-argument', 'Provide valid booking details.')
  }

  const studentRef = db.collection('users').doc(studentId)
  const propertyRef = db.collection('properties').doc(propertyId)
  const roomRef = db.collection('rooms').doc(roomId)
  let bookingId = ''

  await db.runTransaction(async (transaction) => {
    const [studentSnapshot, propertySnapshot, roomSnapshot] = await Promise.all([
      transaction.get(studentRef),
      transaction.get(propertyRef),
      transaction.get(roomRef),
    ])
    if (!studentSnapshot.exists || studentSnapshot.get('role') !== 'student' || studentSnapshot.get('accountStatus') !== 'active') {
      throw new HttpsError('failed-precondition', 'The student account is not active.')
    }
    if (!propertySnapshot.exists || propertySnapshot.get('approvalStatus') !== 'approved') {
      throw new HttpsError('failed-precondition', 'This property is not approved.')
    }
    if (!roomSnapshot.exists || roomSnapshot.get('isActive') !== true) {
      throw new HttpsError('failed-precondition', 'This room is not active.')
    }
    const ownerId = propertySnapshot.get('ownerId')
    if (roomSnapshot.get('propertyId') !== propertyId || roomSnapshot.get('ownerId') !== ownerId) {
      throw new HttpsError('failed-precondition', 'The selected room does not belong to this property.')
    }
    const ownerSnapshot = await transaction.get(db.collection('users').doc(ownerId))
    if (!ownerSnapshot.exists
      || ownerSnapshot.get('role') !== 'owner'
      || ownerSnapshot.get('approvalStatus') !== 'approved'
      || ownerSnapshot.get('accountStatus') !== 'active') {
      throw new HttpsError('failed-precondition', 'The boarding owner is not approved and active.')
    }
    const availableSpaces = roomSnapshot.get('availableSpaces')
    if (!Number.isInteger(availableSpaces) || availableSpaces < 1
      || roomSnapshot.get('availabilityStatus') === 'temporarily_unavailable'
      || roomSnapshot.get('availabilityStatus') === 'occupied'
      || numberOfOccupants > availableSpaces) {
      throw new HttpsError('failed-precondition', 'There are not enough spaces in this room.')
    }
    if (studentPhone.trim().length < 7 || moveInDate.trim().length === 0 || expectedDuration.trim().length === 0) {
      throw new HttpsError('invalid-argument', 'Complete all required booking details.')
    }

    const bookingRef = db.collection('bookings').doc()
    bookingId = bookingRef.id
    transaction.set(bookingRef, {
      bookingId: bookingRef.id,
      studentId,
      ownerId,
      propertyId,
      roomId,
      studentName: studentSnapshot.get('fullName') || '',
      studentEmail: studentSnapshot.get('email') || '',
      studentPhone: studentPhone.trim(),
      numberOfOccupants,
      moveInDate: moveInDate.trim(),
      expectedDuration: expectedDuration.trim(),
      studentMessage: studentMessage.trim(),
      bookingStatus: 'pending',
      rejectionReason: null,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    })
    transaction.set(db.collection('notifications').doc(), {
      userId: ownerId,
      title: 'New Booking Request',
      message: `${studentSnapshot.get('fullName') || 'A student'} requested ${roomSnapshot.get('roomName') || 'a room'}.`,
      type: 'booking_request',
      relatedBookingId: bookingRef.id,
      isRead: false,
      createdAt: FieldValue.serverTimestamp(),
    })
  })

  return { success: true, bookingId }
})

exports.acceptBooking = onCall(async (request) => {
  const ownerId = assertApprovedActiveOwner(request)
  const { bookingId } = request.data || {}
  if (typeof bookingId !== 'string') throw new HttpsError('invalid-argument', 'Provide a booking ID.')

  await db.runTransaction(async (transaction) => {
    const bookingRef = db.collection('bookings').doc(bookingId)
    const bookingSnapshot = await transaction.get(bookingRef)
    if (!bookingSnapshot.exists) throw new HttpsError('not-found', 'Booking not found.')
    if (bookingSnapshot.get('bookingStatus') !== 'pending') throw new HttpsError('failed-precondition', 'This booking is no longer pending.')
    if (bookingSnapshot.get('ownerId') !== ownerId) throw new HttpsError('permission-denied', 'This booking belongs to another owner.')

    const ownerRef = db.collection('users').doc(ownerId)
    const propertyRef = db.collection('properties').doc(bookingSnapshot.get('propertyId'))
    const roomRef = db.collection('rooms').doc(bookingSnapshot.get('roomId'))
    const [ownerSnapshot, propertySnapshot, roomSnapshot] = await Promise.all([
      transaction.get(ownerRef),
      transaction.get(propertyRef),
      transaction.get(roomRef),
    ])
    if (!ownerSnapshot.exists || ownerSnapshot.get('role') !== 'owner'
      || ownerSnapshot.get('approvalStatus') !== 'approved'
      || ownerSnapshot.get('accountStatus') !== 'active') {
      throw new HttpsError('failed-precondition', 'The owner account cannot manage bookings.')
    }
    if (!propertySnapshot.exists || propertySnapshot.get('ownerId') !== ownerId) {
      throw new HttpsError('permission-denied', 'This property belongs to another owner.')
    }
    if (!roomSnapshot.exists || roomSnapshot.get('propertyId') !== bookingSnapshot.get('propertyId')
      || roomSnapshot.get('ownerId') !== ownerId || roomSnapshot.get('isActive') !== true) {
      throw new HttpsError('failed-precondition', 'The room is not available.')
    }
    if (roomSnapshot.get('availabilityStatus') === 'temporarily_unavailable') {
      throw new HttpsError('failed-precondition', 'The room is temporarily unavailable.')
    }
    const occupants = bookingSnapshot.get('numberOfOccupants')
    const maximum = roomSnapshot.get('maximumOccupants')
    const current = roomSnapshot.get('currentOccupants')
    const available = roomSnapshot.get('availableSpaces')
    if (!Number.isInteger(occupants) || occupants < 1
      || !Number.isInteger(maximum) || !Number.isInteger(current) || !Number.isInteger(available)
      || occupants > available) {
      throw new HttpsError('failed-precondition', 'The room no longer has enough available spaces.')
    }

    const newCurrent = current + occupants
    const newAvailable = maximum - newCurrent
    if (newAvailable < 0) throw new HttpsError('failed-precondition', 'The room cannot exceed its capacity.')
    const newStatus = newAvailable === 0 ? 'occupied' : newCurrent === 0 ? 'available' : 'partially_available'

    transaction.update(roomRef, {
      currentOccupants: newCurrent,
      availableSpaces: newAvailable,
      availabilityStatus: newStatus,
      updatedAt: FieldValue.serverTimestamp(),
    })
    transaction.update(bookingRef, {
      bookingStatus: 'accepted',
      rejectionReason: null,
      updatedAt: FieldValue.serverTimestamp(),
    })
    transaction.set(db.collection('notifications').doc(), {
      userId: bookingSnapshot.get('studentId'),
      title: 'Booking Accepted',
      message: 'Your booking request has been accepted.',
      type: 'booking_accepted',
      relatedBookingId: bookingId,
      isRead: false,
      createdAt: FieldValue.serverTimestamp(),
    })
  })
  return { success: true }
})

async function updateBookingAsOwner(request, bookingId, status, reason) {
  const ownerId = assertApprovedActiveOwner(request)
  if (typeof bookingId !== 'string') throw new HttpsError('invalid-argument', 'Provide a booking ID.')
  if (status === 'rejected' && reason !== undefined && (typeof reason !== 'string' || reason.length > 1000)) {
    throw new HttpsError('invalid-argument', 'The rejection reason is too long.')
  }
  await db.runTransaction(async (transaction) => {
    const bookingRef = db.collection('bookings').doc(bookingId)
    const bookingSnapshot = await transaction.get(bookingRef)
    if (!bookingSnapshot.exists) throw new HttpsError('not-found', 'Booking not found.')
    if (bookingSnapshot.get('ownerId') !== ownerId) throw new HttpsError('permission-denied', 'This booking belongs to another owner.')
    if (bookingSnapshot.get('bookingStatus') !== 'pending' && status === 'rejected') {
      throw new HttpsError('failed-precondition', 'This booking is no longer pending.')
    }
    if (bookingSnapshot.get('bookingStatus') !== 'accepted' && status === 'completed') {
      throw new HttpsError('failed-precondition', 'Only accepted bookings can be completed.')
    }
    const ownerSnapshot = await transaction.get(db.collection('users').doc(ownerId))
    if (!ownerSnapshot.exists || ownerSnapshot.get('role') !== 'owner'
      || ownerSnapshot.get('approvalStatus') !== 'approved'
      || ownerSnapshot.get('accountStatus') !== 'active') {
      throw new HttpsError('failed-precondition', 'The owner account cannot manage bookings.')
    }
    const update = { bookingStatus: status, updatedAt: FieldValue.serverTimestamp() }
    if (status === 'rejected') update.rejectionReason = typeof reason === 'string' ? reason.trim() : null
    transaction.update(bookingRef, update)

    const notificationType = status === 'rejected' ? 'booking_rejected'
      : status === 'completed' ? 'booking_completed' : 'booking_expired'
    transaction.set(db.collection('notifications').doc(), {
      userId: bookingSnapshot.get('studentId'),
      title: status === 'rejected' ? 'Booking Rejected' : status === 'completed' ? 'Booking Completed' : 'Booking Expired',
      message: status === 'rejected'
        ? (reason?.trim() ? `Your booking was rejected: ${reason.trim()}` : 'Your booking request was rejected.')
        : status === 'completed' ? 'Your booking has been marked as completed.' : 'Your booking request has expired.',
      type: notificationType,
      relatedBookingId: bookingId,
      isRead: false,
      createdAt: FieldValue.serverTimestamp(),
    })
  })
  return { success: true }
}

exports.rejectBooking = onCall(async (request) => {
  const { bookingId, reason } = request.data || {}
  return updateBookingAsOwner(request, bookingId, 'rejected', reason)
})

exports.completeBooking = onCall(async (request) => {
  const { bookingId } = request.data || {}
  const ownerId = assertApprovedActiveOwner(request)
  if (typeof bookingId !== 'string') throw new HttpsError('invalid-argument', 'Provide a booking ID.')

  await db.runTransaction(async (transaction) => {
    const bookingRef = db.collection('bookings').doc(bookingId)
    const bookingSnapshot = await transaction.get(bookingRef)
    if (!bookingSnapshot.exists) throw new HttpsError('not-found', 'Booking not found.')
    if (bookingSnapshot.get('ownerId') !== ownerId) throw new HttpsError('permission-denied', 'This booking belongs to another owner.')
    if (bookingSnapshot.get('bookingStatus') !== 'accepted') throw new HttpsError('failed-precondition', 'Only accepted bookings can be completed.')

    const ownerSnapshot = await transaction.get(db.collection('users').doc(ownerId))
    if (!ownerSnapshot.exists || ownerSnapshot.get('role') !== 'owner'
      || ownerSnapshot.get('approvalStatus') !== 'approved'
      || ownerSnapshot.get('accountStatus') !== 'active') {
      throw new HttpsError('failed-precondition', 'The owner account cannot manage bookings.')
    }

    const roomRef = db.collection('rooms').doc(bookingSnapshot.get('roomId'))
    const roomSnapshot = await transaction.get(roomRef)
    if (!roomSnapshot.exists) throw new HttpsError('not-found', 'The booked room could not be found.')
    if (roomSnapshot.get('ownerId') !== ownerId) throw new HttpsError('permission-denied', 'This room belongs to another owner.')

    const occupants = bookingSnapshot.get('numberOfOccupants')
    const maximum = roomSnapshot.get('maximumOccupants')
    const current = roomSnapshot.get('currentOccupants')
    const newCurrent = Math.max(0, current - occupants)
    const newAvailable = maximum - newCurrent
    const roomStatus = roomSnapshot.get('availabilityStatus') === 'temporarily_unavailable'
      ? 'temporarily_unavailable'
      : newAvailable === 0 ? 'occupied' : newCurrent === 0 ? 'available' : 'partially_available'

    transaction.update(roomRef, {
      currentOccupants: newCurrent,
      availableSpaces: newAvailable,
      availabilityStatus: roomStatus,
      updatedAt: FieldValue.serverTimestamp(),
    })
    transaction.update(bookingRef, {
      bookingStatus: 'completed',
      updatedAt: FieldValue.serverTimestamp(),
    })
    transaction.set(db.collection('notifications').doc(), {
      userId: bookingSnapshot.get('studentId'),
      title: 'Booking Completed',
      message: 'Your booking has been marked as completed.',
      type: 'booking_completed',
      relatedBookingId: bookingId,
      isRead: false,
      createdAt: FieldValue.serverTimestamp(),
    })
  })
  return { success: true }
})

exports.expireBooking = onCall(async (request) => {
  const { bookingId } = request.data || {}
  const ownerId = assertApprovedActiveOwner(request)
  if (typeof bookingId !== 'string') throw new HttpsError('invalid-argument', 'Provide a booking ID.')
  await db.runTransaction(async (transaction) => {
    const bookingRef = db.collection('bookings').doc(bookingId)
    const bookingSnapshot = await transaction.get(bookingRef)
    if (!bookingSnapshot.exists) throw new HttpsError('not-found', 'Booking not found.')
    if (bookingSnapshot.get('ownerId') !== ownerId) throw new HttpsError('permission-denied', 'This booking belongs to another owner.')
    if (bookingSnapshot.get('bookingStatus') !== 'pending') throw new HttpsError('failed-precondition', 'Only pending requests can expire.')
    transaction.update(bookingRef, { bookingStatus: 'expired', updatedAt: FieldValue.serverTimestamp() })
    transaction.set(db.collection('notifications').doc(), {
      userId: bookingSnapshot.get('studentId'),
      title: 'Booking Expired',
      message: 'Your booking request has expired.',
      type: 'booking_expired',
      relatedBookingId: bookingId,
      isRead: false,
      createdAt: FieldValue.serverTimestamp(),
    })
  })
  return { success: true }
})

exports.cancelBooking = onCall(async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in to continue.')
  const studentId = request.auth.uid
  const { bookingId } = request.data || {}
  if (typeof bookingId !== 'string') throw new HttpsError('invalid-argument', 'Provide a booking ID.')
  await db.runTransaction(async (transaction) => {
    const bookingRef = db.collection('bookings').doc(bookingId)
    const bookingSnapshot = await transaction.get(bookingRef)
    if (!bookingSnapshot.exists) throw new HttpsError('not-found', 'Booking not found.')
    if (bookingSnapshot.get('studentId') !== studentId) throw new HttpsError('permission-denied', 'This booking belongs to another student.')
    if (bookingSnapshot.get('bookingStatus') !== 'pending') throw new HttpsError('failed-precondition', 'Only pending requests can be cancelled.')
    const ownerId = bookingSnapshot.get('ownerId')
    transaction.update(bookingRef, { bookingStatus: 'cancelled', updatedAt: FieldValue.serverTimestamp() })
    transaction.set(db.collection('notifications').doc(), {
      userId: ownerId,
      title: 'Booking Cancelled',
      message: 'A student cancelled a pending booking request.',
      type: 'booking_cancelled',
      relatedBookingId: bookingId,
      isRead: false,
      createdAt: FieldValue.serverTimestamp(),
    })
    transaction.set(db.collection('notifications').doc(), {
      userId: studentId,
      title: 'Booking Cancelled',
      message: 'Your pending booking request was cancelled.',
      type: 'booking_cancelled',
      relatedBookingId: bookingId,
      isRead: false,
      createdAt: FieldValue.serverTimestamp(),
    })
  })
  return { success: true }
})
