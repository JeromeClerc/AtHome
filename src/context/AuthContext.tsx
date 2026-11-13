import type { User } from 'firebase/auth'
import { doc, serverTimestamp, updateDoc } from 'firebase/firestore'
import { createContext, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { db } from '@/config/firebase'
import { refreshUser, subscribeAuth } from '@/services/auth.service'
import { subscribeUserProfile } from '@/services/user.service'
import type { UserProfile } from '@/types'

export interface AuthContextValue {
  /** Utilisateur Firebase Auth (null si déconnecté). */
  user: User | null
  /** Profil Firestore `users/{uid}`. */
  profile: UserProfile | null
  /** true tant que l'état d'authentification initial n'est pas connu. */
  loading: boolean
  emailVerified: boolean
  /** Recharge l'utilisateur (ex. après vérification de l'e-mail). */
  refresh: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [profileLoading, setProfileLoading] = useState(false)
  const [emailVerified, setEmailVerified] = useState(false)

  useEffect(
    () =>
      subscribeAuth((u) => {
        setUser(u)
        setEmailVerified(Boolean(u?.emailVerified))
        setProfileLoading(Boolean(u))
        if (!u) setProfile(null)
        setAuthLoading(false)
      }),
    [],
  )

  useEffect(() => {
    if (!user) return undefined
    return subscribeUserProfile(
      user.uid,
      (p) => {
        setProfile(p)
        setProfileLoading(false)
        // Synchronise l'e-mail après un changement confirmé via `verifyBeforeUpdateEmail`.
        if (p && user.email && p.email !== user.email) {
          void updateDoc(doc(db, 'users', user.uid), { email: user.email, updatedAt: serverTimestamp() })
        }
      },
      () => setProfileLoading(false),
    )
  }, [user])

  const refresh = useCallback(async () => {
    const u = await refreshUser()
    setEmailVerified(Boolean(u?.emailVerified))
    if (u) await u.getIdToken(true)
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({ user, profile, loading: authLoading || profileLoading, emailVerified, refresh }),
    [user, profile, authLoading, profileLoading, emailVerified, refresh],
  )
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
