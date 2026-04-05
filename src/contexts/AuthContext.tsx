import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import {
  onAuthStateChanged,
  signInWithPopup,
  signInWithPhoneNumber,
  RecaptchaVerifier,
  signOut as firebaseSignOut,
  type User,
  type ConfirmationResult,
} from 'firebase/auth'
import { auth, googleProvider } from '../lib/firebase'
import { getOrCreateProfile } from '../lib/workouts'
import type { UserProfile } from '../lib/types'

interface AuthContextType {
  user: User | null
  profile: UserProfile | null
  loading: boolean
  signInWithGoogle: () => Promise<void>
  sendPhoneOtp: (phone: string, recaptchaContainerId: string) => Promise<ConfirmationResult>
  confirmPhoneOtp: (confirmationResult: ConfirmationResult, otp: string) => Promise<void>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be inside AuthProvider')
  return ctx
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  async function loadProfile(u: User) {
    const p = await getOrCreateProfile(
      u.uid,
      u.email || u.phoneNumber || '',
      u.displayName || u.phoneNumber || 'User',
      u.photoURL || undefined
    )
    setProfile(p)
  }

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u)
      if (u) {
        await loadProfile(u)
      } else {
        setProfile(null)
      }
      setLoading(false)
    })
    return unsub
  }, [])

  const signInWithGoogle = async () => {
    const result = await signInWithPopup(auth, googleProvider)
    await loadProfile(result.user)
  }

  const sendPhoneOtp = async (phone: string, recaptchaContainerId: string): Promise<ConfirmationResult> => {
    const recaptchaVerifier = new RecaptchaVerifier(auth, recaptchaContainerId, {
      size: 'invisible',
    })
    const confirmationResult = await signInWithPhoneNumber(auth, phone, recaptchaVerifier)
    return confirmationResult
  }

  const confirmPhoneOtp = async (confirmationResult: ConfirmationResult, otp: string) => {
    const result = await confirmationResult.confirm(otp)
    await loadProfile(result.user)
  }

  const signOut = async () => {
    await firebaseSignOut(auth)
    setProfile(null)
  }

  const refreshProfile = async () => {
    if (user) await loadProfile(user)
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, signInWithGoogle, sendPhoneOtp, confirmPhoneOtp, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  )
}
