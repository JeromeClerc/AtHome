import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  where,
  writeBatch,
} from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import { db, functions } from '@/config/firebase'
import type {
  Atome,
  AtomeRole,
  ChangeRequest,
  ChangeRequestAction,
  ChangeRequestDraft,
  ChangeRequestHistoryEntry,
  CustodyDay,
  DayNote,
  Household,
  IsoDate,
  NotificationType,
  ScheduleMap,
} from '@/types'
import { ACTION_LABELS, transition } from '@/utils/changeRequestMachine'
import { formatDateRanges } from '@/utils/dates'
import { other } from '@/utils/scheduleGenerator'
import { listWithId } from './firestore.helpers'
import { queueNotification } from './notification.service'

const daysOf = (atomeId: string) => collection(db, 'atomes', atomeId, 'days')
const requestsOf = (atomeId: string) => collection(db, 'atomes', atomeId, 'changeRequests')
const notesOf = (atomeId: string) => collection(db, 'atomes', atomeId, 'notes')

/** Nombre maximal d'écritures par lot Firestore. */
const BATCH_LIMIT = 450

/** Contexte de l'utilisateur qui agit. */
export interface Actor {
  uid: string
  name: string
  role: AtomeRole
}

/** Uid du parent titulaire d'un foyer. */
function ownerOf(atome: Atome, household: Household): string | null {
  return atome.households[household].ownerUid
}

// ─── Jours de garde ──────────────────────────────────────────────────────────

/** Écoute en temps réel les jours de garde d'une plage `[start, end]`. */
export function subscribeDays(
  atomeId: string,
  start: IsoDate,
  end: IsoDate,
  cb: (days: CustodyDay[]) => void,
  onError?: (e: Error) => void,
): () => void {
  return onSnapshot(
    query(daysOf(atomeId), where('date', '>=', start), where('date', '<=', end), orderBy('date')),
    (snap) => cb(snap.docs.map((d) => d.data() as CustodyDay)),
    onError,
  )
}

export interface GenerationReport {
  /** Jours nouvellement créés. */
  created: number
  /** Jours automatiques existants recalculés suite au changement de paramètres. */
  updated: number
  /** Jours existants auxquels un enfant non encore planifié a été ajouté. */
  completed: number
  /** Jours automatiques déjà identiques au nouveau calcul (aucune écriture requise). */
  skipped: number
  /** Jours issus d'une modification manuelle validée (lastChangeRequestId != null), strictement préservés. */
  preserved: number
}

/**
 * Enregistre ou régénère un planning automatique :
 * - jour inexistant → créé (`lastChangeRequestId: null`) ;
 * - jour existant généré automatiquement (`lastChangeRequestId == null`) → mis à jour si le nouveau
 *   calcul modifie l'attribution ;
 * - jour ayant fait l'objet d'une modification manuelle validée (`lastChangeRequestId != null`) →
 *   **strictement préservé** (seuls d'éventuels nouveaux enfants sans attribution y sont complétés) ;
 * - les demandes de modification en cours (`atomes/{id}/changeRequests`) ne sont jamais touchées.
 */
export async function saveGeneratedSchedule(atomeId: string, schedule: ScheduleMap): Promise<GenerationReport> {
  const dates = Object.keys(schedule).sort()
  if (dates.length === 0) return { created: 0, updated: 0, completed: 0, skipped: 0, preserved: 0 }
  const existingSnap = await getDocs(
    query(daysOf(atomeId), where('date', '>=', dates[0]), where('date', '<=', dates[dates.length - 1])),
  )
  const existing = new Map<IsoDate, CustodyDay>(existingSnap.docs.map((d) => [d.id, d.data() as CustodyDay]))

  const report: GenerationReport = { created: 0, updated: 0, completed: 0, skipped: 0, preserved: 0 }
  let batch = writeBatch(db)
  let ops = 0
  for (const date of dates) {
    const assignments = schedule[date] ?? {}
    const current = existing.get(date)
    if (!current) {
      batch.set(doc(daysOf(atomeId), date), { date, assignments, lastChangeRequestId: null, updatedAt: serverTimestamp() })
      report.created += 1
    } else if (current.lastChangeRequestId) {
      // Jour modifié manuellement et validé : on ne touche jamais aux attributions existantes.
      const missing = Object.entries(assignments).filter(([pid]) => !(pid in current.assignments))
      if (missing.length === 0) {
        report.preserved += 1
        continue
      }
      const nextAssignments: Record<string, Household> = { ...current.assignments }
      for (const [pid, h] of missing) nextAssignments[pid] = h
      batch.update(doc(daysOf(atomeId), date), { assignments: nextAssignments, updatedAt: serverTimestamp() })
      report.completed += 1
      report.preserved += 1
    } else {
      // Jour purement automatique (lastChangeRequestId == null) : peut être recalculé.
      const hasNewChild = Object.keys(assignments).some((pid) => !(pid in current.assignments))
      const hasChangedChild = Object.entries(assignments).some(
        ([pid, h]) => pid in current.assignments && current.assignments[pid] !== h,
      )
      if (!hasNewChild && !hasChangedChild) {
        report.skipped += 1
        continue
      }
      const nextAssignments: Record<string, Household> = { ...current.assignments, ...assignments }
      batch.update(doc(daysOf(atomeId), date), {
        assignments: nextAssignments,
        lastChangeRequestId: null,
        updatedAt: serverTimestamp(),
      })
      if (hasChangedChild) report.updated += 1
      else report.completed += 1
    }
    ops += 1
    if (ops >= BATCH_LIMIT) {
      await batch.commit()
      batch = writeBatch(db)
      ops = 0
    }
  }
  if (ops > 0) await batch.commit()
  return report
}

// ─── Demandes de modification ────────────────────────────────────────────────

/** Écoute les demandes non clôturées (en attente, contre-proposées ou rejetées). */
export function subscribeOpenChangeRequests(
  atomeId: string,
  cb: (list: ChangeRequest[]) => void,
  onError?: (e: Error) => void,
): () => void {
  return onSnapshot(
    query(requestsOf(atomeId), where('status', 'in', ['pending', 'counter_proposed', 'rejected'])),
    (snap) => cb(listWithId<ChangeRequest>(snap).sort((a, b) => (a.dates[0] ?? '').localeCompare(b.dates[0] ?? ''))),
    onError,
  )
}

/** Écoute l'historique des demandes clôturées (approuvées / annulées), les plus récentes d'abord. */
export function subscribeClosedChangeRequests(
  atomeId: string,
  cb: (list: ChangeRequest[]) => void,
  onError?: (e: Error) => void,
): () => void {
  return onSnapshot(
    query(requestsOf(atomeId), where('status', 'in', ['approved', 'cancelled']), orderBy('updatedAt', 'desc')),
    (snap) => cb(listWithId<ChangeRequest>(snap)),
    onError,
  )
}

function historyEntry(
  action: ChangeRequestAction,
  actor: Actor & { household: Household },
  draft: ChangeRequestDraft,
): ChangeRequestHistoryEntry {
  return {
    action,
    byUid: actor.uid,
    byHousehold: actor.household,
    byName: actor.name,
    at: new Date().toISOString(),
    dates: [...draft.dates].sort(),
    targetHousehold: draft.targetHousehold,
    protonIds: draft.protonIds,
    comment: draft.comment?.trim() || null,
  }
}

const NOTIF_TITLES: Record<ChangeRequestAction, { type: NotificationType; title: string }> = {
  propose: { type: 'change_request', title: 'Nouvelle demande de modification' },
  revise: { type: 'change_request', title: 'Demande révisée' },
  counter_propose: { type: 'change_counter_proposed', title: 'Contre-proposition reçue' },
  approve: { type: 'change_approved', title: 'Modification approuvée' },
  reject: { type: 'change_rejected', title: 'Modification rejetée' },
  cancel: { type: 'change_request', title: 'Demande annulée' },
}

/**
 * Propose une modification du planning. Rien n'est appliqué : la demande est créée en `pending`
 * et l'autre parent est notifié.
 */
export async function proposeChange(
  atome: Atome,
  actor: Actor & { household: Household },
  draft: ChangeRequestDraft,
): Promise<string> {
  if (draft.dates.length === 0) throw new Error('Sélectionnez au moins un jour.')
  if (draft.protonIds.length === 0) throw new Error('Sélectionnez au moins un enfant.')
  const batch = writeBatch(db)
  const ref = doc(requestsOf(atome.id))
  const awaiting = other(actor.household)
  batch.set(ref, {
    dates: [...draft.dates].sort(),
    protonIds: draft.protonIds,
    targetHousehold: draft.targetHousehold,
    status: 'pending',
    createdBy: actor.uid,
    createdByHousehold: actor.household,
    awaitingHousehold: awaiting,
    lastActorUid: actor.uid,
    comment: draft.comment?.trim() || null,
    rejectionReason: null,
    history: [historyEntry('propose', actor, draft)],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  const recipient = ownerOf(atome, awaiting)
  if (recipient) {
    queueNotification(batch, atome.id, {
      recipientUid: recipient,
      type: 'change_request',
      title: NOTIF_TITLES.propose.title,
      body: `${actor.name} propose ${formatDateRanges(draft.dates)}.`,
      actorUid: actor.uid,
      actorName: actor.name,
      actorHousehold: actor.household,
      refId: ref.id,
      date: [...draft.dates].sort()[0] ?? null,
    })
  }
  await batch.commit()
  return ref.id
}

export interface ActOnRequestInput {
  action: Exclude<ChangeRequestAction, 'propose'>
  /** Nouvelle version (contre-proposition ou révision). */
  draft?: ChangeRequestDraft
  /** Motif obligatoire pour un rejet (version validée issue du sas BIFF). */
  reason?: string
}

/**
 * Appelle la Cloud Function sécurisée `rewriteToBiff` pour reformuler un motif de refus brut
 * selon la méthode BIFF (Brief, Informative, Friendly, Firm) via Gemini.
 * Le brouillon brut n'est jamais sauvegardé dans Firestore.
 */
export async function rewriteReasonToBiff(rawReason: string): Promise<string> {
  const clean = rawReason.trim()
  if (!clean) throw new Error('Veuillez saisir un motif de refus.')
  const call = httpsCallable<{ rawReason: string }, { biffText: string }>(functions, 'rewriteToBiff')
  const res = await call({ rawReason: clean })
  const text = res.data?.biffText?.trim()
  if (!text) throw new Error('La reformulation BIFF a renvoyé une réponse vide.')
  return text
}

/**
 * Fait évoluer une demande selon la machine à états. En cas d'approbation, les jours concernés
 * sont mis à jour **dans le même lot** (les règles Firestore vérifient via `getAfter` que la
 * demande référencée vient d'être approuvée par l'autre parent).
 */
export async function actOnChangeRequest(
  atome: Atome,
  request: ChangeRequest,
  actor: Actor & { household: Household },
  input: ActOnRequestInput,
): Promise<void> {
  const { action } = input
  const next = transition(request, action, actor.household, input.reason)
  const draft: ChangeRequestDraft = input.draft ?? {
    dates: request.dates,
    protonIds: request.protonIds,
    targetHousehold: request.targetHousehold,
    comment: action === 'reject' ? input.reason : null,
  }
  if (draft.dates.length === 0 || draft.protonIds.length === 0) throw new Error('La demande doit contenir des jours et des enfants.')

  const batch = writeBatch(db)
  const ref = doc(requestsOf(atome.id), request.id)
  const entry = historyEntry(action, actor, { ...draft, comment: action === 'reject' ? input.reason : draft.comment })
  const patch: Record<string, unknown> = {
    status: next.status,
    awaitingHousehold: next.awaitingHousehold,
    lastActorUid: actor.uid,
    history: [...request.history, entry],
    updatedAt: serverTimestamp(),
  }
  if (action === 'counter_propose' || action === 'revise') {
    patch.dates = [...draft.dates].sort()
    patch.protonIds = draft.protonIds
    patch.targetHousehold = draft.targetHousehold
    patch.comment = draft.comment?.trim() || null
    patch.rejectionReason = null
  }
  if (action === 'reject') patch.rejectionReason = input.reason?.trim() ?? null
  batch.update(ref, patch)

  if (action === 'approve') {
    // Fusion champ par champ : seuls les enfants concernés sont réattribués.
    const assignmentFields = request.protonIds.map((pid) => `assignments.${pid}`)
    const assignments = Object.fromEntries(request.protonIds.map((pid) => [pid, request.targetHousehold]))
    for (const date of request.dates) {
      batch.set(
        doc(daysOf(atome.id), date),
        { date, assignments, lastChangeRequestId: request.id, updatedAt: serverTimestamp() },
        { mergeFields: [...assignmentFields, 'date', 'lastChangeRequestId', 'updatedAt'] },
      )
    }
  }

  // Notifie l'autre parent.
  const recipientHousehold = other(actor.household)
  const recipient = ownerOf(atome, recipientHousehold)
  if (recipient) {
    const meta = NOTIF_TITLES[action]
    const reason = action === 'reject' ? ` Motif : ${input.reason?.trim()}` : ''
    queueNotification(batch, atome.id, {
      recipientUid: recipient,
      type: meta.type,
      title: meta.title,
      body: `${actor.name} — ${ACTION_LABELS[action].toLowerCase()} : ${formatDateRanges(draft.dates)}.${reason}`,
      actorUid: actor.uid,
      actorName: actor.name,
      actorHousehold: actor.household,
      refId: request.id,
      date: [...draft.dates].sort()[0] ?? null,
    })
  }
  await batch.commit()
}

// ─── Notes ───────────────────────────────────────────────────────────────────

export function subscribeNotes(
  atomeId: string,
  start: IsoDate,
  end: IsoDate,
  cb: (notes: DayNote[]) => void,
  onError?: (e: Error) => void,
): () => void {
  return onSnapshot(
    query(notesOf(atomeId), where('date', '>=', start), where('date', '<=', end), orderBy('date')),
    (snap) => cb(listWithId<DayNote>(snap)),
    onError,
  )
}

/** Ajoute une note sur un ou plusieurs jours et notifie les parents (sauf l'auteur). */
export async function addNotes(atome: Atome, actor: Actor, dates: IsoDate[], text: string): Promise<void> {
  const clean = text.trim()
  if (!clean) throw new Error('La note est vide.')
  if (clean.length > 1000) throw new Error('La note ne peut pas dépasser 1000 caractères.')
  const batch = writeBatch(db)
  for (const date of dates) {
    batch.set(doc(notesOf(atome.id)), {
      date,
      text: clean,
      authorUid: actor.uid,
      authorRole: actor.role,
      authorName: actor.name,
      createdAt: serverTimestamp(),
    })
  }
  const recipients = (['electron', 'positron'] as const)
    .map((h) => ownerOf(atome, h))
    .filter((uid): uid is string => Boolean(uid) && uid !== actor.uid)
  for (const recipientUid of recipients) {
    queueNotification(batch, atome.id, {
      recipientUid,
      type: 'note_added',
      title: 'Nouvelle note',
      body: `${actor.name} (${formatDateRanges(dates)}) : ${clean.slice(0, 120)}`,
      actorUid: actor.uid,
      actorName: actor.name,
      actorHousehold: actor.role === 'electron' || actor.role === 'positron' ? actor.role : null,
      refId: null,
      date: [...dates].sort()[0] ?? null,
    })
  }
  await batch.commit()
}

export async function deleteNote(atomeId: string, noteId: string): Promise<void> {
  await deleteDoc(doc(notesOf(atomeId), noteId))
}
