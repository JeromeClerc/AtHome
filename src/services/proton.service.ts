import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
} from 'firebase/firestore'
import { db } from '@/config/firebase'
import type { Proton, ProtonInput } from '@/types'
import { majorityDate } from '@/utils/age'
import { listWithId } from './firestore.helpers'

const protonsOf = (atomeId: string) => collection(db, 'atomes', atomeId, 'protons')

function normalize(input: ProtonInput): Record<string, unknown> {
  return {
    firstName: input.firstName.trim(),
    lastName: input.lastName.trim(),
    birthDate: input.birthDate,
    gender: input.gender,
    email: input.email?.trim() || null,
    phone: input.phone || null,
    // Dénormalisé pour que les règles de sécurité puissent appliquer la règle de majorité.
    majorityAt: Timestamp.fromDate(majorityDate(input.birthDate)),
    updatedAt: serverTimestamp(),
  }
}

export function subscribeProtons(atomeId: string, cb: (list: Proton[]) => void, onError?: (e: Error) => void): () => void {
  return onSnapshot(query(protonsOf(atomeId), orderBy('birthDate')), (snap) => cb(listWithId<Proton>(snap)), onError)
}

export async function createProton(atomeId: string, input: ProtonInput, colorIndex: number): Promise<string> {
  const ref = await addDoc(protonsOf(atomeId), {
    ...normalize(input),
    colorIndex,
    linkedUid: null,
    createdAt: serverTimestamp(),
  })
  return ref.id
}

export async function updateProton(atomeId: string, id: string, input: ProtonInput): Promise<void> {
  await updateDoc(doc(protonsOf(atomeId), id), normalize(input))
}

export async function deleteProton(atomeId: string, id: string): Promise<void> {
  await deleteDoc(doc(protonsOf(atomeId), id))
}
