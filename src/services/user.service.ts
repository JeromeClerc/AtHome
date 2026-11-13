import { doc, onSnapshot, serverTimestamp, writeBatch } from 'firebase/firestore'
import { db } from '@/config/firebase'
import type { UserProfile, UserProfileInput } from '@/types'

export function subscribeUserProfile(uid: string, cb: (p: UserProfile | null) => void, onError?: (e: Error) => void): () => void {
  return onSnapshot(
    doc(db, 'users', uid),
    (snap) => cb(snap.exists() ? ({ ...(snap.data() as Omit<UserProfile, 'uid'>), uid: snap.id } as UserProfile) : null),
    onError,
  )
}

/**
 * Met à jour le profil personnel et propage le nom affiché dans chaque Atome dont l'utilisateur est membre
 * (`memberProfiles.{uid}.displayName`), afin que les autres membres voient le nouveau nom.
 */
export async function updateUserProfile(uid: string, input: UserProfileInput, atomeIds: string[]): Promise<void> {
  const batch = writeBatch(db)
  batch.update(doc(db, 'users', uid), { ...input, updatedAt: serverTimestamp() })
  const displayName = `${input.firstName.trim()} ${input.lastName.trim()}`
  for (const atomeId of atomeIds) {
    batch.update(doc(db, 'atomes', atomeId), { [`memberProfiles.${uid}.displayName`]: displayName })
  }
  await batch.commit()
}
