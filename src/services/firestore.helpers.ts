import { FirebaseError } from 'firebase/app'
import type { DocumentSnapshot, QuerySnapshot } from 'firebase/firestore'

/**
 * Convertit un snapshot Firestore en objet typé avec son identifiant.
 * Les documents sont validés à l'écriture par `firestore.rules` ; la lecture fait donc confiance au schéma.
 */
export function withId<T extends { id: string }>(snap: DocumentSnapshot): T {
  return { ...(snap.data() as Omit<T, 'id'>), id: snap.id } as T
}

export function listWithId<T extends { id: string }>(snap: QuerySnapshot): T[] {
  return snap.docs.map((d) => withId<T>(d))
}

const MESSAGES: Record<string, string> = {
  'auth/invalid-credential': 'E-mail ou mot de passe incorrect.',
  'auth/invalid-email': 'Adresse e-mail invalide.',
  'auth/user-not-found': 'Aucun compte ne correspond à cet e-mail.',
  'auth/wrong-password': 'Mot de passe incorrect.',
  'auth/email-already-in-use': 'Un compte existe déjà avec cet e-mail.',
  'auth/weak-password': 'Le mot de passe doit contenir au moins 8 caractères.',
  'auth/too-many-requests': 'Trop de tentatives. Réessayez dans quelques minutes.',
  'auth/requires-recent-login': 'Par sécurité, reconnectez-vous avant cette opération.',
  'auth/network-request-failed': 'Problème de connexion réseau.',
  'auth/invalid-action-code': 'Ce lien a déjà été utilisé ou a expiré. Demandez un nouveau lien.',
  'auth/expired-action-code': 'Ce lien a expiré. Demandez un nouveau lien.',
  'auth/operation-not-allowed': "Cette méthode de connexion n'est pas activée dans Firebase Authentication.",
  'auth/invalid-phone-number': 'Numéro de téléphone invalide (ex. +41 79 123 45 67).',
  'auth/invalid-verification-code': 'Code SMS incorrect.',
  'auth/code-expired': 'Le code SMS a expiré. Demandez-en un nouveau.',
  'auth/missing-verification-code': 'Saisissez le code reçu par SMS.',
  'auth/credential-already-in-use': 'Ce numéro est déjà associé à un autre compte.',
  'auth/account-exists-with-different-credential': 'Ce numéro est déjà associé à un autre compte.',
  'auth/quota-exceeded': "Quota d'envoi de SMS atteint. Réessayez plus tard.",
  'auth/captcha-check-failed': 'Vérification anti-robot échouée. Rechargez la page et réessayez.',
  'auth/unauthorized-domain': "Ce domaine n'est pas autorisé dans Firebase Authentication.",
  'auth/unauthorized-continue-uri': "Le domaine de retour du lien n'est pas autorisé dans Firebase Authentication.",
  'messaging/permission-blocked': 'Notifications bloquées dans les réglages du navigateur.',
  'messaging/unsupported-browser': 'Ce navigateur ne prend pas en charge les notifications push.',
  'permission-denied': "Vous n'avez pas les droits nécessaires pour cette action.",
  'functions/permission-denied': "Vous n'avez pas les droits nécessaires pour cette action.",
  'functions/not-found': 'Invitation introuvable ou expirée.',
  'functions/failed-precondition': 'Cette invitation ne peut plus être utilisée.',
  unavailable: 'Service momentanément indisponible. Vos modifications seront synchronisées.',
}

/** Traduit une erreur Firebase (ou autre) en message français lisible. */
export function toFrenchError(error: unknown): string {
  if (error instanceof FirebaseError) {
    return MESSAGES[error.code] ?? (error.code.startsWith('functions/') ? error.message : `Erreur : ${error.code}`)
  }
  if (error instanceof Error) return error.message
  return 'Une erreur inattendue est survenue.'
}
