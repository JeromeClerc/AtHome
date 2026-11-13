import {
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
  type WriteBatch,
} from 'firebase/firestore'
import { db } from '@/config/firebase'
import type { AppNotification } from '@/types'
import { listWithId } from './firestore.helpers'

const notificationsOf = (atomeId: string) => collection(db, 'atomes', atomeId, 'notifications')

export type NotificationDraft = Omit<AppNotification, 'id' | 'read' | 'createdAt'>

/**
 * Ajoute une notification à un lot d'écritures (pour qu'elle soit créée atomiquement avec l'action
 * qui la déclenche). La Cloud Function `onNotificationCreated` la relaie ensuite en notification push (Cloud Messaging)
 * sur le téléphone du destinataire s'il a vérifié son mobile et activé les notifications.
 */
export function queueNotification(batch: WriteBatch, atomeId: string, draft: NotificationDraft): void {
  batch.set(doc(notificationsOf(atomeId)), { ...draft, read: false, createdAt: serverTimestamp() })
}

export function subscribeNotifications(
  atomeId: string,
  uid: string,
  cb: (list: AppNotification[]) => void,
  onError?: (e: Error) => void,
): () => void {
  return onSnapshot(
    query(notificationsOf(atomeId), where('recipientUid', '==', uid), orderBy('createdAt', 'desc'), limit(50)),
    (snap) => cb(listWithId<AppNotification>(snap)),
    onError,
  )
}

export async function markNotificationRead(atomeId: string, id: string): Promise<void> {
  await updateDoc(doc(notificationsOf(atomeId), id), { read: true })
}

export async function markAllNotificationsRead(atomeId: string, ids: string[]): Promise<void> {
  if (ids.length === 0) return
  const batch = writeBatch(db)
  for (const id of ids) batch.update(doc(notificationsOf(atomeId), id), { read: true })
  await batch.commit()
}
