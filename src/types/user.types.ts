import type { Timestamp } from 'firebase/firestore'
import type { Household } from './atome.types'

/** Profil personnel d'un utilisateur (document `users/{uid}`). */
export interface UserProfile {
  uid: string
  firstName: string
  lastName: string
  email: string
  /**
   * Mobile au format E.164 (`+41791234567`), copie du numéro **vérifié** par Firebase Auth
   * (fournisseur Téléphone). La source de vérité reste `user.phoneNumber` côté Auth.
   */
  phone: string | null
  /** Accepte de recevoir les notifications push (Firebase Cloud Messaging) sur son téléphone. */
  pushOptIn: boolean
  atomeIds: string[]
  createdAt: Timestamp | null
  updatedAt: Timestamp | null
}

export type UserProfileInput = Pick<UserProfile, 'firstName' | 'lastName'>

export type NotificationType =
  | 'change_request'
  | 'change_counter_proposed'
  | 'change_approved'
  | 'change_rejected'
  | 'note_added'
  | 'member_joined'

/** Notification in-app (document `atomes/{atomeId}/notifications/{id}`). */
export interface AppNotification {
  id: string
  recipientUid: string
  type: NotificationType
  title: string
  body: string
  actorUid: string
  actorName: string
  actorHousehold?: Household | null
  /** Référence vers la demande ou la note concernée. */
  refId?: string | null
  /** Premier jour concerné (navigation). */
  date?: string | null
  read: boolean
  createdAt: Timestamp | null
}
