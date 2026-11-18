import { getStorage, type FirebaseStorage } from 'firebase/storage'
import { app } from './config'

export const storage: FirebaseStorage | null = import.meta.env.VITE_FIREBASE_STORAGE_BUCKET
  ? getStorage(app)
  : null
