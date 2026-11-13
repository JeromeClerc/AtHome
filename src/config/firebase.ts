/**
 * Initialisation du SDK Firebase à partir des variables d'environnement Vite (`.env.local`).
 * Si la configuration est absente, `isFirebaseConfigured` vaut false et l'application affiche
 * un écran d'aide au lieu de planter.
 */
import { initializeApp, type FirebaseApp, type FirebaseOptions } from 'firebase/app'
import { connectAuthEmulator, getAuth, type Auth } from 'firebase/auth'
import {
  connectFirestoreEmulator,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  type Firestore,
} from 'firebase/firestore'
import { connectFunctionsEmulator, getFunctions, type Functions } from 'firebase/functions'
import type { Messaging } from 'firebase/messaging'

const env = import.meta.env

const firebaseConfig: FirebaseOptions = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
}

export const isFirebaseConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId)

export const FUNCTIONS_REGION = env.VITE_FIREBASE_FUNCTIONS_REGION || 'europe-west6'

/** Clé publique VAPID utilisée par Cloud Messaging pour les notifications push Web. */
export const VAPID_KEY = env.VITE_FIREBASE_VAPID_KEY ?? ''

function init(): { app: FirebaseApp; auth: Auth; db: Firestore; functions: Functions } {
  const app = initializeApp(isFirebaseConfigured ? firebaseConfig : { apiKey: 'demo', projectId: 'demo-at-home' })
  const auth = getAuth(app)
  auth.languageCode = 'fr'
  const db = initializeFirestore(app, {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
  })
  const functions = getFunctions(app, FUNCTIONS_REGION)

  if (env.VITE_USE_EMULATORS === 'true') {
    connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true })
    connectFirestoreEmulator(db, '127.0.0.1', 8080)
    connectFunctionsEmulator(functions, '127.0.0.1', 5001)
  }
  return { app, auth, db, functions }
}

export const { app, auth, db, functions } = init()

let messagingPromise: Promise<Messaging | null> | null = null

/**
 * Instance Firebase Cloud Messaging, ou null si le navigateur ne gère pas les notifications push
 * (ex. Safari iOS hors application installée sur l'écran d'accueil).
 */
export function getMessagingIfSupported(): Promise<Messaging | null> {
  // Chargement à la demande : le SDK Messaging n'alourdit pas le bundle initial.
  messagingPromise ??= import('firebase/messaging')
    .then(async ({ getMessaging, isSupported }) => ((await isSupported()) ? getMessaging(app) : null))
    .catch(() => null)
  return messagingPromise
}
