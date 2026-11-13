import {
  arrayUnion,
  collection,
  doc,
  getDoc,
  limit,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore'
import { db } from '@/config/firebase'
import type { Atome, Household, HouseholdInfo, UserProfile } from '@/types'
import { RESERVED_SLUGS, slugify } from '@/utils/strings'
import { listWithId } from './firestore.helpers'

const atomes = collection(db, 'atomes')

/** Vérifie qu'un slug est libre (non réservé, non utilisé). */
export async function isSlugAvailable(slug: string): Promise<boolean> {
  if (!slug || RESERVED_SLUGS.has(slug)) return false
  const snap = await getDoc(doc(db, 'slugs', slug))
  return !snap.exists()
}

/** Propose un slug libre à partir d'un nom, en suffixant -2, -3… si nécessaire. */
export async function suggestSlug(name: string): Promise<string> {
  const base = slugify(name) || 'famille'
  for (let i = 1; i < 50; i += 1) {
    const candidate = i === 1 ? base : `${base}-${i}`
    if (await isSlugAvailable(candidate)) return candidate
  }
  return `${base}-${Date.now().toString(36)}`
}

export interface CreateAtomeInput {
  name: string
  slug: string
  electron: Omit<HouseholdInfo, 'ownerUid'>
  positron: Omit<HouseholdInfo, 'ownerUid'>
}

/**
 * Crée un Atome de manière atomique (transaction) :
 * réservation du slug (`slugs/{slug}`), création de l'Atome avec le créateur comme Électron,
 * et ajout de l'Atome dans le profil utilisateur.
 * @throws si le slug est déjà pris.
 */
export async function createAtome(input: CreateAtomeInput, user: UserProfile): Promise<Atome> {
  const ref = doc(atomes)
  const slugRef = doc(db, 'slugs', input.slug)
  const displayName = `${user.firstName} ${user.lastName}`
  const data: Omit<Atome, 'id' | 'createdAt'> = {
    name: input.name.trim(),
    slug: input.slug,
    createdBy: user.uid,
    members: { [user.uid]: 'electron' },
    memberUids: [user.uid],
    memberProfiles: { [user.uid]: { displayName, role: 'electron', email: user.email, protonId: null } },
    households: {
      electron: { ...input.electron, ownerUid: user.uid },
      positron: { ...input.positron, ownerUid: null },
    },
  }
  await runTransaction(db, async (tx) => {
    const slugSnap = await tx.get(slugRef)
    if (slugSnap.exists() || RESERVED_SLUGS.has(input.slug)) {
      throw new Error(`L'identifiant « ${input.slug} » est déjà utilisé.`)
    }
    tx.set(slugRef, { atomeId: ref.id, createdBy: user.uid })
    tx.set(ref, { ...data, createdAt: serverTimestamp() })
    tx.update(doc(db, 'users', user.uid), { atomeIds: arrayUnion(ref.id), updatedAt: serverTimestamp() })
  })
  return { ...data, id: ref.id, createdAt: null }
}

/** Écoute les Atomes dont l'utilisateur est membre. */
export function subscribeMyAtomes(uid: string, cb: (list: Atome[]) => void, onError?: (e: Error) => void): () => void {
  return onSnapshot(
    query(atomes, where('memberUids', 'array-contains', uid)),
    (snap) => cb(listWithId<Atome>(snap)),
    onError,
  )
}

/** Écoute un Atome par son slug (seulement si l'utilisateur en est membre). */
export function subscribeAtomeBySlug(
  slug: string,
  uid: string,
  cb: (atome: Atome | null) => void,
  onError?: (e: Error) => void,
): () => void {
  return onSnapshot(
    query(atomes, where('slug', '==', slug), where('memberUids', 'array-contains', uid), limit(1)),
    (snap) => cb(listWithId<Atome>(snap)[0] ?? null),
    onError,
  )
}

export async function updateHousehold(atomeId: string, household: Household, info: Partial<HouseholdInfo>): Promise<void> {
  const patch: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(info)) {
    if (key !== 'ownerUid') patch[`households.${household}.${key}`] = value ?? null
  }
  await updateDoc(doc(db, 'atomes', atomeId), patch)
}

export async function renameAtome(atomeId: string, name: string): Promise<void> {
  await updateDoc(doc(db, 'atomes', atomeId), { name: name.trim() })
}
