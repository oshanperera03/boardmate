import {
  onAuthStateChanged,
  reload,
  type User as FirebaseUser,
} from 'firebase/auth'
import { doc, onSnapshot } from 'firebase/firestore'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { auth, db } from '../services/firebase/config'
import { getUserProfile } from '../services/users/userService'
import type { UserProfile } from '../types/user'

interface AuthContextValue {
  authUser: FirebaseUser | null
  profile: UserProfile | null
  loading: boolean
  profileError: string | null
  refreshProfile: () => Promise<void>
  refreshVerification: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authUser, setAuthUser] = useState<FirebaseUser | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [profileError, setProfileError] = useState<string | null>(null)

  const refreshProfile = useCallback(async () => {
    if (!auth.currentUser) {
      setProfile(null)
      return
    }
    const userProfile = await getUserProfile(auth.currentUser.uid)
    if (!userProfile) {
      throw new Error('Your account profile is missing. Please contact support.')
    }
    if (userProfile.role === 'admin') {
      const token = await auth.currentUser.getIdTokenResult(true)
      if (token.claims.admin !== true) {
        throw new Error('Administrator access could not be verified.')
      }
    }
    setProfile(userProfile)
  }, [])

  const refreshVerification = useCallback(async () => {
    if (!auth.currentUser) return
    await reload(auth.currentUser)
    setAuthUser(auth.currentUser)
  }, [])

  useEffect(() => {
    let active = true
    let unsubscribeProfile: (() => void) | undefined
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!active) return
      unsubscribeProfile?.()
      unsubscribeProfile = undefined
      setAuthUser(firebaseUser)
      setProfile(null)
      setProfileError(null)
      if (!firebaseUser) {
        setLoading(false)
        return
      }
      setLoading(true)
      unsubscribeProfile = onSnapshot(
        doc(db, 'users', firebaseUser.uid),
        async (snapshot) => {
          if (!active || auth.currentUser?.uid !== firebaseUser.uid) return
          try {
            if (!snapshot.exists()) throw new Error('Your account profile is missing. Please contact support.')
            const userProfile = snapshot.data() as UserProfile
            if (userProfile.role === 'admin') {
              const token = await firebaseUser.getIdTokenResult(true)
              if (token.claims.admin !== true) throw new Error('Administrator access could not be verified.')
            }
            if (active) {
              setProfile(userProfile)
              setProfileError(null)
            }
          } catch (error) {
            if (active) setProfileError(error instanceof Error ? error.message : 'Unable to load your account.')
          } finally {
            if (active) setLoading(false)
          }
        },
        (error) => {
          if (active) {
            setProfileError(error.message)
            setLoading(false)
          }
        }
      )
    })
    return () => {
      active = false
      unsubscribeProfile?.()
      unsubscribe()
    }
  }, [])

  const value = useMemo(
    () => ({ authUser, profile, loading, profileError, refreshProfile, refreshVerification }),
    [authUser, profile, loading, profileError, refreshProfile, refreshVerification],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside AuthProvider.')
  return context
}
