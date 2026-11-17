export const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
export const sriLankanPhonePattern = /^(?:\+94|0)7\d{8}$/
export const strongPasswordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/

export function getFirebaseErrorMessage(error: unknown): string {
  const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : ''
  const messages: Record<string, string> = {
    'auth/email-already-in-use': 'An account with this email already exists.',
    'auth/invalid-email': 'Enter a valid email address.',
    'auth/invalid-credential': 'The email or password is incorrect.',
    'auth/user-not-found': 'No account was found with this email.',
    'auth/wrong-password': 'The email or password is incorrect.',
    'auth/weak-password': 'Choose a stronger password with at least 8 characters.',
    'auth/too-many-requests': 'Too many attempts. Please wait a moment and try again.',
    'auth/network-request-failed': 'Network error. Check your connection and try again.',
    'permission-denied': 'You do not have permission to perform this action.',
    'functions/permission-denied': 'You do not have permission to perform this action.',
    'functions/unauthenticated': 'Please sign in again and retry.',
  }
  if (code in messages) return messages[code]
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.'
}
