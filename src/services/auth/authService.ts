import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from 'firebase/auth'
import { doc, serverTimestamp, setDoc } from 'firebase/firestore'
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
  await sendEmailVerification(credential.user)
}

export async function login(email: string, password: string): Promise<void> {
  await signInWithEmailAndPassword(auth, email, password)
}

export async function loginAsAdmin(email: string, password: string): Promise<void> {
  const credential = await signInWithEmailAndPassword(auth, email, password)
  const token = await credential.user.getIdTokenResult(true)
  if (token.claims.admin !== true) {
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

export async function resendVerification(): Promise<void> {
  if (!auth.currentUser) throw new Error('Please sign in first.')
  await sendEmailVerification(auth.currentUser)
}
