/**
 * Service d'authentification — uniquement des fonctionnalités natives de Firebase Authentication :
 * - e-mail + mot de passe (inscription, connexion, vérification d'adresse, mot de passe oublié) ;
 * - lien de connexion par e-mail (« passwordless »), utilisé aussi pour les **invitations** ;
 * - vérification du numéro de mobile par SMS (fournisseur Téléphone), qui active les notifications.
 * Les e-mails et SMS sont envoyés par Firebase Auth lui-même (aucune extension, aucun service tiers).
 */
import {
  createUserWithEmailAndPassword,
  isSignInWithEmailLink,
  linkWithCredential,
  onAuthStateChanged,
  PhoneAuthProvider,
  RecaptchaVerifier,
  reload,
  sendEmailVerification,
  sendPasswordResetEmail,
  sendSignInLinkToEmail,
  signInWithEmailAndPassword,
  signInWithEmailLink,
  signOut,
  updatePassword,
  updatePhoneNumber,
  updateProfile,
  verifyBeforeUpdateEmail,
  type ActionCodeSettings,
  type User,
} from 'firebase/auth'
import { doc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore'
import { auth, db } from '@/config/firebase'

/** Clé de stockage local de l'e-mail utilisé pour un lien de connexion (exigence Firebase). */
const EMAIL_FOR_SIGN_IN = 'athome.emailForSignIn'

export interface RegisterInput {
  email: string
  password: string
  firstName: string
  lastName: string
}

/** URL de retour après un lien d'e-mail Firebase (vérification, reset). */
function actionSettings(path = '/'): ActionCodeSettings {
  return { url: `${window.location.origin}${path}` }
}

/** Paramètres d'un lien de connexion par e-mail traité directement dans l'application. */
export function emailLinkSettings(url: string): ActionCodeSettings {
  return { url, handleCodeInApp: true }
}

/**
 * Crée le profil Firestore `users/{uid}` (une seule fois, à la création du compte).
 */
export async function createUserProfile(user: User, firstName: string, lastName: string): Promise<void> {
  await setDoc(doc(db, 'users', user.uid), {
    uid: user.uid,
    firstName: firstName.trim(),
    lastName: lastName.trim(),
    email: user.email,
    phone: user.phoneNumber ?? null,
    pushOptIn: false,
    atomeIds: [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  await updateProfile(user, { displayName: `${firstName.trim()} ${lastName.trim()}` })
}

/**
 * Crée un compte e-mail + mot de passe, son profil et envoie l'e-mail de vérification (Firebase Auth).
 * @param continuePath Page vers laquelle revenir après vérification.
 */
export async function register(input: RegisterInput, continuePath = '/'): Promise<User> {
  const cred = await createUserWithEmailAndPassword(auth, input.email.trim(), input.password)
  await createUserProfile(cred.user, input.firstName, input.lastName)
  await sendEmailVerification(cred.user, actionSettings(continuePath))
  return cred.user
}

export async function login(email: string, password: string): Promise<User> {
  const cred = await signInWithEmailAndPassword(auth, email.trim(), password)
  return cred.user
}

export function logout(): Promise<void> {
  return signOut(auth)
}

export function resetPassword(email: string): Promise<void> {
  return sendPasswordResetEmail(auth, email.trim(), actionSettings('/auth'))
}

export async function resendVerification(): Promise<void> {
  if (auth.currentUser) await sendEmailVerification(auth.currentUser, actionSettings('/'))
}

/** Recharge l'utilisateur (après clic sur le lien de vérification) et renvoie son état. */
export async function refreshUser(): Promise<User | null> {
  if (!auth.currentUser) return null
  await reload(auth.currentUser)
  return auth.currentUser
}

/** Change l'adresse e-mail : Firebase envoie un lien de confirmation à la nouvelle adresse. */
export async function requestEmailChange(newEmail: string): Promise<void> {
  if (!auth.currentUser) throw new Error('Non connecté.')
  await verifyBeforeUpdateEmail(auth.currentUser, newEmail.trim(), actionSettings('/'))
}

export function subscribeAuth(callback: (user: User | null) => void): () => void {
  return onAuthStateChanged(auth, callback)
}

// ─── Lien de connexion par e-mail (passwordless) ────────────────────────────

/**
 * Envoie un lien de connexion par e-mail (modèle « Connexion par lien » de Firebase Auth).
 * L'adresse est mémorisée localement pour finaliser la connexion sans la redemander.
 * @param email Destinataire.
 * @param returnUrl URL complète de retour dans l'application (domaine autorisé).
 */
export async function sendLoginLink(email: string, returnUrl: string): Promise<void> {
  await sendSignInLinkToEmail(auth, email.trim(), emailLinkSettings(returnUrl))
  try {
    localStorage.setItem(EMAIL_FOR_SIGN_IN, email.trim())
  } catch {
    /* stockage indisponible : l'adresse sera redemandée */
  }
}

/** L'URL courante est-elle un lien de connexion Firebase ? */
export function isEmailLink(href: string = window.location.href): boolean {
  return isSignInWithEmailLink(auth, href)
}

/** E-mail mémorisé lors de l'envoi du lien (même navigateur), sinon null. */
export function storedEmailForLink(): string | null {
  try {
    return localStorage.getItem(EMAIL_FOR_SIGN_IN)
  } catch {
    return null
  }
}

/**
 * Finalise la connexion par lien. Crée le compte s'il n'existe pas ; l'e-mail est alors vérifié.
 * Les paramètres techniques (`oobCode`, `apiKey`, `mode`…) sont ensuite retirés de l'URL.
 */
export async function completeLinkSignIn(email: string, href: string = window.location.href): Promise<User> {
  const cred = await signInWithEmailLink(auth, email.trim(), href)
  try {
    localStorage.removeItem(EMAIL_FOR_SIGN_IN)
  } catch {
    /* ignoré */
  }
  const url = new URL(href)
  for (const p of ['apiKey', 'oobCode', 'mode', 'lang', 'continueUrl', 'tenantId']) url.searchParams.delete(p)
  window.history.replaceState(null, '', `${url.pathname}${url.search}`)
  return cred.user
}

/** L'utilisateur possède-t-il un mot de passe (fournisseur « password ») ? */
export function hasPassword(user: User): boolean {
  return user.providerData.some((p) => p.providerId === 'password')
}

/** Définit (ou change) le mot de passe de l'utilisateur connecté. */
export async function setPassword(password: string): Promise<void> {
  if (!auth.currentUser) throw new Error('Non connecté.')
  await updatePassword(auth.currentUser, password)
}

// ─── Vérification du numéro de mobile (fournisseur Téléphone) ───────────────

let recaptcha: RecaptchaVerifier | null = null

/**
 * Envoie un code SMS de vérification (envoyé par Firebase Auth) au numéro indiqué.
 * @param phoneE164 Numéro au format international, ex. `+41791234567`.
 * @param recaptchaContainerId Id d'un élément DOM vide servant au reCAPTCHA invisible.
 * @returns Identifiant de vérification à passer à {@link confirmPhoneCode}.
 */
export async function sendPhoneVerificationCode(phoneE164: string, recaptchaContainerId: string): Promise<string> {
  recaptcha?.clear()
  recaptcha = new RecaptchaVerifier(auth, recaptchaContainerId, { size: 'invisible' })
  try {
    return await new PhoneAuthProvider(auth).verifyPhoneNumber(phoneE164, recaptcha)
  } catch (e) {
    recaptcha.clear()
    recaptcha = null
    throw e
  }
}

/**
 * Valide le code SMS et associe le numéro au compte (ou le remplace s'il en existait un).
 * Le numéro vérifié est recopié dans le profil Firestore pour l'affichage.
 */
export async function confirmPhoneCode(verificationId: string, code: string): Promise<string> {
  const user = auth.currentUser
  if (!user) throw new Error('Non connecté.')
  const credential = PhoneAuthProvider.credential(verificationId, code.trim())
  const hasPhone = user.providerData.some((p) => p.providerId === 'phone')
  if (hasPhone) await updatePhoneNumber(user, credential)
  else await linkWithCredential(user, credential)
  await reload(user)
  const phone = user.phoneNumber ?? null
  await updateDoc(doc(db, 'users', user.uid), { phone, updatedAt: serverTimestamp() })
  recaptcha?.clear()
  recaptcha = null
  return phone ?? ''
}
