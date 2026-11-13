/**
 * Notifications push sur le téléphone via **Firebase Cloud Messaging** (FCM).
 *
 * Chaque appareil autorisé enregistre un jeton FCM dans `users/{uid}/fcmTokens/{token}`.
 * La Cloud Function `onNotificationCreated` envoie ensuite chaque notification in-app aux appareils
 * de l'utilisateur, à condition que son numéro de mobile soit vérifié par Firebase Auth et qu'il ait
 * activé les notifications (`pushOptIn`).
 *
 * Sur iPhone / iPad (iOS 16.4+), le push Web n'est disponible qu'une fois l'application ajoutée à
 * l'écran d'accueil (Partager › « Sur l'écran d'accueil »).
 */
import { deleteDoc, doc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore'
import { deleteToken, getToken } from 'firebase/messaging'
import { db, getMessagingIfSupported, VAPID_KEY } from '@/config/firebase'

const DEVICE_TOKEN_KEY = 'athome.fcmToken'
const SW_URL = '/firebase-messaging-sw.js'

export type PushSupport = 'supported' | 'unsupported' | 'ios-needs-install' | 'not-configured'

function isIos(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
}

function isStandalone(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true
}

/** Diagnostique la prise en charge des notifications push sur cet appareil. */
export async function getPushSupport(): Promise<PushSupport> {
  if (!VAPID_KEY) return 'not-configured'
  if (isIos() && !isStandalone()) return 'ios-needs-install'
  if (!('serviceWorker' in navigator) || !('Notification' in window)) return 'unsupported'
  return (await getMessagingIfSupported()) ? 'supported' : 'unsupported'
}

/** Jeton FCM enregistré pour cet appareil (stockage local), s'il existe. */
export function currentDeviceToken(): string | null {
  try {
    return localStorage.getItem(DEVICE_TOKEN_KEY)
  } catch {
    return null
  }
}

/**
 * Active les notifications sur cet appareil : demande l'autorisation, enregistre le service worker,
 * obtient un jeton FCM et le sauvegarde dans Firestore.
 * @throws si l'autorisation est refusée ou si l'appareil n'est pas compatible.
 */
export async function enablePushOnThisDevice(uid: string): Promise<string> {
  const messaging = await getMessagingIfSupported()
  if (!messaging) throw new Error("Ce navigateur ne prend pas en charge les notifications push.")
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') {
    throw new Error("Notifications refusées. Autorisez-les dans les réglages du navigateur pour ce site, puis réessayez.")
  }
  const registration = await navigator.serviceWorker.register(SW_URL)
  await navigator.serviceWorker.ready
  const token = await getToken(messaging, { vapidKey: VAPID_KEY, serviceWorkerRegistration: registration })
  if (!token) throw new Error("Impossible d'obtenir un jeton de notification.")
  await setDoc(doc(db, 'users', uid, 'fcmTokens', token), {
    token,
    userAgent: navigator.userAgent.slice(0, 200),
    createdAt: serverTimestamp(),
    lastSeenAt: serverTimestamp(),
  })
  await updateDoc(doc(db, 'users', uid), { pushOptIn: true, updatedAt: serverTimestamp() })
  try {
    localStorage.setItem(DEVICE_TOKEN_KEY, token)
  } catch {
    /* ignoré */
  }
  return token
}

/** Désactive les notifications sur cet appareil (jeton supprimé côté FCM et Firestore). */
export async function disablePushOnThisDevice(uid: string): Promise<void> {
  const token = currentDeviceToken()
  const messaging = await getMessagingIfSupported()
  if (messaging) await deleteToken(messaging).catch(() => false)
  if (token) await deleteDoc(doc(db, 'users', uid, 'fcmTokens', token))
  try {
    localStorage.removeItem(DEVICE_TOKEN_KEY)
  } catch {
    /* ignoré */
  }
}

/** Active / désactive globalement les notifications pour tous les appareils de l'utilisateur. */
export async function setPushOptIn(uid: string, value: boolean): Promise<void> {
  await updateDoc(doc(db, 'users', uid), { pushOptIn: value, updatedAt: serverTimestamp() })
}
