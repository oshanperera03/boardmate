import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from 'firebase/auth'
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore'
import type { RegistrationInput } from '../../types/user'
import { auth, db } from '../firebase/config'

export async function register(input: RegistrationInput): Promise<void> {
  const credential = await createUserWithEmailAndPassword(auth, input.email, input.password)
  await updateProfile(credential.user, { displayName: input.fullName })
  await setDoc(doc(db, 'users', credential.user.uid), {
    uid: credential.user.uid,
    fullName: input.fullName,
    email: input.email,
    phoneNumber: input.phoneNumber,
    role: input.role,
    approvalStatus: input.role === 'owner' ? 'pending' : 'not_required',
    accountStatus: 'active',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
}

export async function login(email: string, password: string): Promise<void> {
  await signInWithEmailAndPassword(auth, email, password)
}

export async function loginWithGoogle(expectedRole: 'student' | 'owner' = 'student'): Promise<void> {
  const provider = new GoogleAuthProvider()
  provider.setCustomParameters({ prompt: 'select_account' })
  const credential = await signInWithPopup(auth, provider)
  const snapshot = await getDoc(doc(db, 'users', credential.user.uid))

  if (!snapshot.exists()) {
    await signOut(auth)
    throw new Error('No Boardmate profile exists for this Google account. Please register first.')
  }

  const profile = snapshot.data()
  if (profile.role !== expectedRole) {
    await signOut(auth)
    throw new Error(
      expectedRole === 'owner'
        ? 'This Google account is registered as a student. Use the student sign-in page.'
        : 'This Google account is registered as an owner. Use the owner sign-in page.',
    )
  }
}

export async function registerWithGoogle(role: 'student' | 'owner'): Promise<void> {
  const provider = new GoogleAuthProvider()
  provider.setCustomParameters({ prompt: 'select_account' })
  const credential = await signInWithPopup(auth, provider)
  const profileRef = doc(db, 'users', credential.user.uid)
  const snapshot = await getDoc(profileRef)

  if (snapshot.exists()) {
    const existingRole = snapshot.data().role
    if (existingRole !== role) {
      await signOut(auth)
      throw new Error(
        role === 'owner'
          ? 'This Google account is already registered as a student.'
          : 'This Google account is already registered as an owner.',
      )
    }
    return
  }

  await setDoc(profileRef, {
    uid: credential.user.uid,
    fullName: credential.user.displayName || credential.user.email?.split('@')[0] || 'Boardmate user',
    email: credential.user.email || '',
    phoneNumber: '',
    role,
    approvalStatus: role === 'owner' ? 'pending' : 'not_required',
    accountStatus: 'active',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
}

export async function loginAsAdmin(email: string, password: string): Promise<void> {
  const credential = await signInWithEmailAndPassword(auth, email, password)
  const token = await credential.user.getIdTokenResult(true)
  if (token.claims.admin !== true) {
    await signOut(auth)
    throw new Error('This account is not authorized for administrator access.')
  }
}

export async function loginAsAdminWithGoogle(): Promise<void> {
  const provider = new GoogleAuthProvider()
  provider.setCustomParameters({ prompt: 'select_account' })
  const credential = await signInWithPopup(auth, provider)
  const token = await credential.user.getIdTokenResult(true)

  if (token.claims.admin !== true) {
    await signOut(auth)
    throw new Error('This account is not authorized for administrator access.')
  }

  const snapshot = await getDoc(doc(db, 'users', credential.user.uid))
  if (!snapshot.exists() || snapshot.data().role !== 'admin') {
    await signOut(auth)
    throw new Error('This account is not authorized for administrator access.')
  }
}

export async function logout(): Promise<void> {
  await signOut(auth)
}

export async function requestPasswordReset(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email)
}
