/**
 * Cloud Functions — At Home
 *
 * - acceptInvitation (callable) : rattache l'utilisateur connecté à un Atome à partir d'un jeton
 *   d'invitation. Seul point d'entrée pour ajouter un membre (les règles l'interdisent aux clients).
 * - onNotificationCreated (trigger) : relaie chaque notification in-app en notification push sur le
 *   téléphone du destinataire via Firebase Cloud Messaging (numéro vérifié par Firebase Auth requis).
 *
 * Aucune extension Firebase ni service tiers : l'e-mail d'invitation est envoyé côté client par
 * Firebase Authentication (lien de connexion par e-mail), les notifications par Cloud Messaging.
 */
import { initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { FieldValue, getFirestore, Timestamp } from 'firebase-admin/firestore'
import { getMessaging } from 'firebase-admin/messaging'
import { setGlobalOptions } from 'firebase-functions/v2'
import { onDocumentCreated } from 'firebase-functions/v2/firestore'
import { HttpsError, onCall } from 'firebase-functions/v2/https'
import { defineString } from 'firebase-functions/params'
import { logger } from 'firebase-functions'

initializeApp()
const db = getFirestore()

const APP_URL = defineString('APP_URL', { description: "URL publique de l'application, sans slash final" })

setGlobalOptions({ region: process.env.FUNCTIONS_REGION || 'europe-west6', maxInstances: 10 })

type Role = 'electron' | 'positron' | 'proton' | 'neutron'

interface InvitationDoc {
  token: string
  atomeId: string
  atomeSlug: string
  atomeName: string
  role: Exclude<Role, 'electron'>
  email: string
  protonId?: string | null
  invitedBy: string
  invitedByName: string
  status: 'pending' | 'accepted' | 'revoked'
  expiresAt: Timestamp | null
}

const ROLE_LABELS: Record<Role, string> = {
  electron: 'Électron (foyer 1)',
  positron: 'Positron (second parent)',
  proton: 'Proton (enfant)',
  neutron: 'Neutron (accès en lecture seule)',
}

// ─── Acceptation d'une invitation ───────────────────────────────────────────

export const acceptInvitation = onCall<{ atomeId?: string; token?: string }>(async (request) => {
  const auth = request.auth
  if (!auth) throw new HttpsError('unauthenticated', 'Connectez-vous pour accepter cette invitation.')
  const { atomeId, token } = request.data ?? {}
  if (typeof atomeId !== 'string' || typeof token !== 'string' || !atomeId || !token) {
    throw new HttpsError('invalid-argument', 'Lien d\'invitation invalide.')
  }
  const email = (auth.token.email ?? '').toLowerCase()

  const atomeRef = db.doc(`atomes/${atomeId}`)
  const invRef = atomeRef.collection('invitations').doc(token)
  const userRef = db.doc(`users/${auth.uid}`)

  const result = await db.runTransaction(async (tx) => {
    const [invSnap, atomeSnap, userSnap] = await Promise.all([tx.get(invRef), tx.get(atomeRef), tx.get(userRef)])
    if (!invSnap.exists || !atomeSnap.exists) throw new HttpsError('not-found', 'Invitation introuvable.')
    const inv = invSnap.data() as InvitationDoc
    const atome = atomeSnap.data() as {
      slug: string
      members: Record<string, Role>
      households: { positron: { ownerUid: string | null } }
    }

    if (atome.members[auth.uid]) return { atomeSlug: atome.slug, role: atome.members[auth.uid] as InvitationDoc['role'] }
    if (inv.status !== 'pending') throw new HttpsError('failed-precondition', 'Cette invitation a déjà été utilisée ou révoquée.')
    if (inv.expiresAt && inv.expiresAt.toMillis() < Date.now()) throw new HttpsError('failed-precondition', 'Cette invitation a expiré.')
    if (inv.email.toLowerCase() !== email) {
      throw new HttpsError('permission-denied', `Cette invitation est destinée à ${inv.email}.`)
    }
    if (inv.role === 'positron' && atome.households.positron.ownerUid) {
      throw new HttpsError('failed-precondition', 'Le foyer Positron a déjà un titulaire.')
    }

    const profile = userSnap.data() as { firstName?: string; lastName?: string } | undefined
    const displayName = [profile?.firstName, profile?.lastName].filter(Boolean).join(' ') || auth.token.name || email

    const patch: Record<string, unknown> = {
      [`members.${auth.uid}`]: inv.role,
      memberUids: FieldValue.arrayUnion(auth.uid),
      [`memberProfiles.${auth.uid}`]: { displayName, role: inv.role, email, protonId: inv.protonId ?? null },
    }
    if (inv.role === 'positron') patch['households.positron.ownerUid'] = auth.uid
    tx.update(atomeRef, patch)

    if (inv.role === 'proton' && inv.protonId) {
      tx.update(atomeRef.collection('protons').doc(inv.protonId), { linkedUid: auth.uid })
    }
    tx.update(invRef, { status: 'accepted', acceptedBy: auth.uid, acceptedAt: FieldValue.serverTimestamp() })
    tx.set(userRef, { atomeIds: FieldValue.arrayUnion(atomeId), updatedAt: FieldValue.serverTimestamp() }, { merge: true })
    tx.create(atomeRef.collection('notifications').doc(), {
      recipientUid: inv.invitedBy,
      type: 'member_joined',
      title: 'Nouveau membre',
      body: `${displayName} a rejoint l'Atome en tant que ${ROLE_LABELS[inv.role]}.`,
      actorUid: auth.uid,
      actorName: displayName,
      actorHousehold: inv.role === 'positron' ? 'positron' : null,
      refId: null,
      date: null,
      read: false,
      createdAt: FieldValue.serverTimestamp(),
    })
    return { atomeSlug: atome.slug, role: inv.role }
  })

  logger.info('Invitation acceptée', { atomeId, uid: auth.uid, role: result.role })
  return result
})

// ─── Notifications push (Firebase Cloud Messaging) ─────────────────────────

/** Codes d'erreur FCM signalant un jeton d'appareil à supprimer. */
const STALE_TOKEN_ERRORS = new Set(['messaging/registration-token-not-registered', 'messaging/invalid-registration-token'])

/**
 * Relaie chaque notification in-app sur le téléphone du destinataire via Cloud Messaging, si :
 * - son numéro de mobile est vérifié dans Firebase Authentication (fournisseur Téléphone) ;
 * - il a activé les notifications (`users/{uid}.pushOptIn`) ;
 * - au moins un appareil est enregistré (`users/{uid}/fcmTokens`).
 * Les jetons expirés sont nettoyés automatiquement.
 */
export const onNotificationCreated = onDocumentCreated('atomes/{atomeId}/notifications/{notificationId}', async (event) => {
  const n = event.data?.data() as { recipientUid?: string; title?: string; body?: string; date?: string | null; refId?: string | null; type?: string } | undefined
  if (!n?.recipientUid) return
  const uid = n.recipientUid

  const [userSnap, authUser, tokensSnap, atomeSnap] = await Promise.all([
    db.doc(`users/${uid}`).get(),
    getAuth().getUser(uid).catch(() => null),
    db.collection(`users/${uid}/fcmTokens`).get(),
    db.doc(`atomes/${event.params.atomeId}`).get(),
  ])
  const profile = userSnap.data() as { pushOptIn?: boolean } | undefined
  if (!profile?.pushOptIn || !authUser?.phoneNumber || tokensSnap.empty) return

  const slug = (atomeSnap.data() as { slug?: string } | undefined)?.slug ?? ''
  const query = new URLSearchParams()
  if (n.date) query.set('date', n.date)
  if (n.refId && n.type !== 'note_added') query.set('request', n.refId)
  const link = `${APP_URL.value()}/${slug}${query.size ? `?${query.toString()}` : ''}`

  const tokens = tokensSnap.docs.map((d) => d.id)
  const response = await getMessaging().sendEachForMulticast({
    tokens,
    // Message « data » : affiché par public/firebase-messaging-sw.js (titre, texte, lien au clic).
    data: { title: n.title ?? 'At Home', body: (n.body ?? '').slice(0, 300), link, tag: event.params.notificationId },
    webpush: { headers: { Urgency: 'high', TTL: '86400' } },
  })

  const stale = response.responses
    .map((r, i) => (!r.success && r.error && STALE_TOKEN_ERRORS.has(r.error.code) ? tokens[i] : null))
    .filter((t): t is string => Boolean(t))
  await Promise.all(stale.map((t) => db.doc(`users/${uid}/fcmTokens/${t}`).delete()))
  logger.info('Notification push envoyée', { atomeId: event.params.atomeId, success: response.successCount, failures: response.failureCount, cleaned: stale.length })
})
