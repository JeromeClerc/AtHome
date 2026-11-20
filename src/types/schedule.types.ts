import type { Timestamp } from 'firebase/firestore'
import type { AtomeRole, Household } from './atome.types'

/** Date « jour » au format ISO `yyyy-MM-dd` (sans fuseau horaire). */
export type IsoDate = string

/** Jour de garde : attribution d'un foyer pour chaque enfant. */
export interface CustodyDay {
  date: IsoDate
  /** protonId → foyer */
  assignments: Record<string, Household>
  /** Demande approuvée à l'origine de la dernière modification. */
  lastChangeRequestId?: string | null
  updatedAt?: Timestamp | null
}

/** Planning en mémoire : date → (protonId → foyer). */
export type ScheduleMap = Record<IsoDate, Record<string, Household>>

/** Modèles d'alternance proposés par le générateur. */
export type AlternancePattern =
  | 'weekly'
  | 'two-two-three'
  | 'two-two-five-five'
  | 'alternate-weekends'
  | 'custom'

export interface GeneratorOptions {
  /** Premier jour généré (inclus). */
  startDate: IsoDate
  /** Dernier jour généré (inclus). */
  endDate: IsoDate
  pattern: AlternancePattern
  /** Foyer qui commence le cycle au `startDate`. */
  firstHousehold: Household
  /** Séquence personnalisée (pattern `custom`), ex. ['electron','electron','positron']. */
  customCycle?: Household[]
  protonIds: string[]
  /** Applique la règle des ponts fériés (défaut : true). */
  applyHolidayBridges?: boolean
  /**
   * Applique la règle d'alternance par blocs sur les fêtes majeures :
   * Noël / Nouvel An (2 blocs sur les vacances scolaires vaudoises de fin d'année)
   * et Pâques (week-end/bloc de Pâques), avec alternance automatique années paires / impaires.
   */
  applyHolidayBlocks?: boolean
  /**
   * Foyer « Parent A » accueillant les enfants sur le Bloc 1 (Noël) et Pâques lors des années paires
   * (le Bloc 2 Nouvel An allant au Parent B, avec inversion automatique les années impaires).
   * Défaut : `'electron'`.
   */
  evenYearHolidayHousehold?: Household
}

export type ChangeRequestStatus =
  | 'pending'
  | 'counter_proposed'
  | 'approved'
  | 'rejected'
  | 'cancelled'

export type ChangeRequestAction = 'propose' | 'approve' | 'counter_propose' | 'reject' | 'revise' | 'cancel'

export interface ChangeRequestHistoryEntry {
  action: ChangeRequestAction
  byUid: string
  byHousehold: Household
  byName: string
  /** Horodatage ISO (les `serverTimestamp` sont interdits dans les tableaux). */
  at: string
  dates: IsoDate[]
  targetHousehold: Household
  protonIds: string[]
  comment?: string | null
}

/** Demande de modification ponctuelle du planning, soumise à validation de l'autre parent. */
export interface ChangeRequest {
  id: string
  dates: IsoDate[]
  protonIds: string[]
  /** Foyer auquel les jours seraient attribués. */
  targetHousehold: Household
  status: ChangeRequestStatus
  createdBy: string
  createdByHousehold: Household
  /** Foyer qui doit agir (approuver, contre-proposer, rejeter, ou réviser après rejet). */
  awaitingHousehold: Household
  lastActorUid: string
  comment?: string | null
  rejectionReason?: string | null
  history: ChangeRequestHistoryEntry[]
  createdAt: Timestamp | null
  updatedAt: Timestamp | null
}

export interface ChangeRequestDraft {
  dates: IsoDate[]
  protonIds: string[]
  targetHousehold: Household
  comment?: string | null
}

/** Note libre attachée à un jour. */
export interface DayNote {
  id: string
  date: IsoDate
  text: string
  authorUid: string
  authorRole: AtomeRole
  authorName: string
  createdAt: Timestamp | null
}

export type CalendarView = 'week' | 'month' | 'year'
export type NavigationStep = 'day' | 'week' | 'month' | 'year'
