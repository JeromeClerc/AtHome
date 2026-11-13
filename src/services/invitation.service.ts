import { collection, doc, getDoc, onSnapshot, orderBy, query, serverTimestamp, setDoc, Timestamp, updateDoc } from 'firebase/firestore'
import { sendSignInLinkToEmail } from 'firebase/auth'
import { httpsCallable } from 'firebase/functions'
import { auth, db, functions } from '@/config/firebase'
import type { Atome, Invitation, InvitationRole, UserProfile } from '@/types'
import { randomToken } from '@/utils/strings'
import { listWithId } from './firestore.helpers'

/** Durée de validité d'une invitation. */
export const INVITATION_TTL_DAYS = 14

const invitationsOf = (atomeId: string) => collection(db, 'atomes', atomeId, 'invitations')

/** URL de la page d'invitation (contient le jeton secret et l'identifiant de l'Atome). */
export function invitationUrl(inv: Pick<Invitation, 'token' | 'atomeId'>): string {
  return `${window.location.origin}/invite/${inv.token}?a=${inv.atomeId}`
}

/**
 * Envoie l'e-mail d'invitation **par Firebase Authentication** (modèle « Connexion par lien e-mail »).
 * Le lien reçu connecte directement l'invité avec son adresse (compte créé si besoin, e-mail vérifié)
 * puis le ramène sur `/invite/<jeton>?a=<atomeId>` où il finalise son profil et rejoint l'Atome.
 * Aucun service d'e-mail tiers ni extension n'est nécessaire.
 */
export async function sendInvitationEmail(inv: Pick<Invitation, 'token' | 'atomeId' | 'email'>): Promise<void> {
  await sendSignInLinkToEmail(auth, inv.email, { url: invitationUrl(inv), handleCodeInApp: true })
}

export interface CreateInvitationInput {
  email: string
  role: InvitationRole
  protonId?: string | null
}

/**
 * Crée une invitation (document `atomes/{atomeId}/invitations/{token}`) puis envoie l'e-mail.
 * Le jeton est généré côté client avec `crypto.getRandomValues` (192 bits) et sert d'identifiant secret.
 */
export async function createInvitation(atome: Atome, input: CreateInvitationInput, inviter: UserProfile): Promise<Invitation> {
  const token = randomToken()
  const expiresAt = Timestamp.fromMillis(Date.now() + INVITATION_TTL_DAYS * 24 * 3600 * 1000)
  const data: Omit<Invitation, 'createdAt'> = {
    token,
    atomeId: atome.id,
    atomeSlug: atome.slug,
    atomeName: atome.name,
    role: input.role,
    email: input.email.trim().toLowerCase(),
    protonId: input.protonId ?? null,
    invitedBy: inviter.uid,
    invitedByName: `${inviter.firstName} ${inviter.lastName}`,
    status: 'pending',
    expiresAt,
    acceptedBy: null,
  }
  await setDoc(doc(invitationsOf(atome.id), token), { ...data, createdAt: serverTimestamp() })
  await sendInvitationEmail(data)
  return { ...data, createdAt: null }
}

/** Lecture publique d'une invitation par son jeton (aucune liste possible sans être membre). */
export async function getInvitation(atomeId: string, token: string): Promise<Invitation | null> {
  const snap = await getDoc(doc(invitationsOf(atomeId), token))
  return snap.exists() ? (snap.data() as Invitation) : null
}

export function subscribeInvitations(atomeId: string, cb: (list: Invitation[]) => void, onError?: (e: Error) => void): () => void {
  return onSnapshot(
    query(invitationsOf(atomeId), orderBy('createdAt', 'desc')),
    (snap) => cb(listWithId<Invitation & { id: string }>(snap)),
    onError,
  )
}

export async function revokeInvitation(atomeId: string, token: string): Promise<void> {
  await updateDoc(doc(invitationsOf(atomeId), token), { status: 'revoked' })
}

interface AcceptResult {
  atomeSlug: string
  role: InvitationRole
}

/**
 * Accepte une invitation via la Cloud Function `acceptInvitation`, seule habilitée à ajouter
 * un membre dans un Atome (les règles Firestore interdisent l'auto-inscription).
 */
export async function acceptInvitation(atomeId: string, token: string): Promise<AcceptResult> {
  const call = httpsCallable<{ atomeId: string; token: string }, AcceptResult>(functions, 'acceptInvitation')
  const res = await call({ atomeId, token })
  return res.data
}
