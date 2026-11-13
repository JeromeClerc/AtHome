import type { ChangeRequest, ChangeRequestAction, ChangeRequestStatus, Household } from '@/types'
import { other } from './scheduleGenerator'

/**
 * Machine à états des demandes de modification du planning.
 *
 * ```
 * propose ─▶ pending ──approve──▶ approved (définitif)
 *              │  ▲  └─reject────▶ rejected ──revise──▶ pending
 *              │  │                    └─────cancel──▶ cancelled
 *     counter_propose
 *              ▼  │
 *        counter_proposed (même transitions que pending, rôles inversés)
 * ```
 *
 * - Seul le foyer `awaitingHousehold` peut agir sur une demande `pending` / `counter_proposed`.
 * - Après un rejet, c'est au demandeur initial de réviser (`revise`) ou d'annuler (`cancel`).
 * - Le dernier proposant peut annuler sa propre demande tant qu'elle n'est pas approuvée.
 */
export const TRANSITIONS: Record<ChangeRequestStatus, Partial<Record<ChangeRequestAction, ChangeRequestStatus>>> = {
  pending: { approve: 'approved', counter_propose: 'counter_proposed', reject: 'rejected', cancel: 'cancelled' },
  counter_proposed: {
    approve: 'approved',
    counter_propose: 'counter_proposed',
    reject: 'rejected',
    cancel: 'cancelled',
  },
  rejected: { revise: 'pending', cancel: 'cancelled' },
  approved: {},
  cancelled: {},
}

export const STATUS_LABELS: Record<ChangeRequestStatus, string> = {
  pending: 'En attente de validation',
  counter_proposed: 'Contre-proposition',
  approved: 'Approuvée',
  rejected: 'Rejetée',
  cancelled: 'Annulée',
}

export const ACTION_LABELS: Record<ChangeRequestAction, string> = {
  propose: 'Proposition',
  approve: 'Approbation',
  counter_propose: 'Contre-proposition',
  reject: 'Rejet',
  revise: 'Révision',
  cancel: 'Annulation',
}

export function isOpen(status: ChangeRequestStatus): boolean {
  return status === 'pending' || status === 'counter_proposed' || status === 'rejected'
}

/** Une demande est « en attente » (affichée en surimpression sur le planning). */
export function isAwaitingDecision(status: ChangeRequestStatus): boolean {
  return status === 'pending' || status === 'counter_proposed'
}

/**
 * Indique si un foyer peut exécuter une action sur une demande.
 * @param request Demande actuelle.
 * @param action Action souhaitée.
 * @param actor Foyer de l'utilisateur courant.
 */
export function canPerform(
  request: Pick<ChangeRequest, 'status' | 'awaitingHousehold'>,
  action: ChangeRequestAction,
  actor: Household,
): boolean {
  const next = TRANSITIONS[request.status][action]
  if (!next) return false
  if (action === 'cancel') {
    // Annulation : par le proposant (celui qui n'est PAS attendu) ou, après rejet, par le demandeur (attendu).
    return request.status === 'rejected' ? actor === request.awaitingHousehold : actor !== request.awaitingHousehold
  }
  return actor === request.awaitingHousehold
}

/**
 * Calcule l'état suivant d'une demande.
 * @throws si la transition est interdite ou si un rejet n'est pas motivé.
 */
export function transition(
  request: Pick<ChangeRequest, 'status' | 'awaitingHousehold'>,
  action: ChangeRequestAction,
  actor: Household,
  reason?: string | null,
): { status: ChangeRequestStatus; awaitingHousehold: Household } {
  if (!canPerform(request, action, actor)) {
    throw new Error(`Action « ${ACTION_LABELS[action]} » impossible sur une demande « ${STATUS_LABELS[request.status]} ».`)
  }
  if (action === 'reject' && !reason?.trim()) {
    throw new Error('Un motif est obligatoire pour rejeter une demande.')
  }
  const status = TRANSITIONS[request.status][action] as ChangeRequestStatus
  let awaitingHousehold = request.awaitingHousehold
  if (action === 'counter_propose' || action === 'reject' || action === 'revise') {
    // La balle passe dans le camp de l'autre foyer.
    awaitingHousehold = other(actor)
  }
  return { status, awaitingHousehold }
}
