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
