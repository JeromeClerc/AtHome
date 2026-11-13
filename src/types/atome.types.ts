import type { Timestamp } from 'firebase/firestore'

/** Foyer de garde : Électron (foyer 1) ou Positron (foyer 2). */
export type Household = 'electron' | 'positron'

/** Rôle d'un membre dans un Atome. */
export type AtomeRole = Household | 'proton' | 'neutron'

export const HOUSEHOLDS: readonly Household[] = ['electron', 'positron'] as const

/** Informations d'un foyer (adresse affichée, propriétaire). */
export interface HouseholdInfo {
  /** Libellé libre, ex. « Chez Papa », « Foyer Dupont ». */
  label: string
  ownerUid: string | null
  /** E-mail auquel l'invitation a été envoyée (positron uniquement). */
  inviteEmail?: string | null
  street?: string
  npa?: string
  city?: string
}

/** Profil public d'un membre, dénormalisé dans l'Atome (lisible par tous les membres). */
export interface MemberProfile {
  displayName: string
  role: AtomeRole
  email: string
  /** Pour un membre de rôle `proton` : identifiant de la fiche enfant liée. */
  protonId?: string | null
}

/** Atome : espace isolé d'une famille (tenant). */
export interface Atome {
  id: string
  name: string
  slug: string
  createdBy: string
  createdAt: Timestamp | null
  /** uid → rôle */
  members: Record<string, AtomeRole>
  /** Liste des uid membres (pour les requêtes `array-contains`). */
  memberUids: string[]
  memberProfiles: Record<string, MemberProfile>
  households: Record<Household, HouseholdInfo>
}

export type Gender = 'female' | 'male' | 'other'

/** Proton : un enfant rattaché à l'Atome. */
export interface Proton {
  id: string
  firstName: string
  lastName: string
  /** Date de naissance ISO `yyyy-MM-dd`. */
  birthDate: string
  gender: Gender
  email?: string | null
  phone?: string | null
  /** Date (Timestamp) des 18 ans révolus, utilisée par les règles de sécurité. */
  majorityAt: Timestamp | null
  /** uid du compte utilisateur de l'enfant, s'il a été invité. */
  linkedUid?: string | null
  /** Couleur d'affichage optionnelle (index de palette). */
  colorIndex: number
  createdAt: Timestamp | null
  updatedAt: Timestamp | null
}

export type ProtonInput = Pick<Proton, 'firstName' | 'lastName' | 'birthDate' | 'gender'> & {
  email?: string | null
  phone?: string | null
}

export type InvitationRole = Exclude<AtomeRole, 'electron'>
export type InvitationStatus = 'pending' | 'accepted' | 'revoked'

/** Invitation par e-mail ; l'identifiant du document est le jeton secret. */
export interface Invitation {
  token: string
  atomeId: string
  atomeSlug: string
  atomeName: string
  role: InvitationRole
  email: string
  /** Pour une invitation `proton` : fiche enfant à lier. */
  protonId?: string | null
  invitedBy: string
  invitedByName: string
  status: InvitationStatus
  createdAt: Timestamp | null
  expiresAt: Timestamp | null
  acceptedBy?: string | null
}
