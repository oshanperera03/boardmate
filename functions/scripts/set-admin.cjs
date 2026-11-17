const { initializeApp, applicationDefault } = require('firebase-admin/app')
const { getAuth } = require('firebase-admin/auth')
const { getFirestore, FieldValue } = require('firebase-admin/firestore')

const uid = process.argv[2]
if (!uid) {
  console.error('Usage: npm run set-admin -- <existing-firebase-auth-uid>')
  process.exit(1)
}

initializeApp({ credential: applicationDefault() })

async function setAdministrator() {
  const auth = getAuth()
  const db = getFirestore()
  const account = await auth.getUser(uid)
  if (account.disabled) {
    throw new Error('The Firebase Authentication account is disabled.')
  }
  await auth.setCustomUserClaims(uid, { ...account.customClaims, admin: true })
  await db.collection('users').doc(uid).set(
    {
      uid,
      fullName: account.displayName || account.email || 'Administrator',
      email: account.email || '',
      phoneNumber: account.phoneNumber || '',
      role: 'admin',
      approvalStatus: 'not_required',
      accountStatus: 'active',
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  )
  console.log(`Administrator access configured for ${account.email || uid}.`)
}

setAdministrator().catch((error) => {
  console.error('Administrator setup failed:', error)
  process.exitCode = 1
})
