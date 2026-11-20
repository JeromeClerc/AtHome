import { useCallback, useEffect, useMemo, useState } from 'react'
import { toFrenchError } from '@/services/firestore.helpers'
import {
  actOnChangeRequest,
  addNotes,
  deleteNote,
  proposeChange,
  rewriteReasonToBiff,
  saveGeneratedSchedule,
  subscribeDays,
  subscribeNotes,
  subscribeOpenChangeRequests,
  type ActOnRequestInput,
  type Actor,
  type GenerationReport,
} from '@/services/schedule.service'
import type { ChangeRequest, ChangeRequestDraft, CustodyDay, DayNote, IsoDate, ScheduleMap } from '@/types'
import { isAwaitingDecision } from '@/utils/changeRequestMachine'
import { useAtome } from './useAtome'
import { useAuth } from './useAuth'

/** Écoute temps réel des jours de garde d'une plage. */
export function useCustodyDays(atomeId: string, start: IsoDate, end: IsoDate) {
  const [days, setDays] = useState<CustodyDay[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    setLoading(true)
    return subscribeDays(
      atomeId,
      start,
      end,
      (d) => {
        setDays(d)
        setLoading(false)
        setError(null)
      },
      (e) => {
        setError(toFrenchError(e))
        setLoading(false)
      },
    )
  }, [atomeId, start, end])
  const schedule = useMemo<ScheduleMap>(() => Object.fromEntries(days.map((d) => [d.date, d.assignments])), [days])
  return { schedule, loading, error }
}

export interface ScheduleData {
  schedule: ScheduleMap
  /** Demandes ouvertes (toutes dates). */
  requests: ChangeRequest[]
  /** Demandes en attente de décision, indexées par date. */
  pendingByDate: Map<IsoDate, ChangeRequest[]>
  notesByDate: Map<IsoDate, DayNote[]>
  loading: boolean
  error: string | null
}

/**
 * Données du planning pour une plage visible : jours de garde, notes et demandes en attente,
 * le tout synchronisé en temps réel.
 */
export function useSchedule(start: IsoDate, end: IsoDate): ScheduleData {
  const { atome } = useAtome()
  const { schedule, loading, error } = useCustodyDays(atome.id, start, end)
  const [notes, setNotes] = useState<DayNote[]>([])
  const [requests, setRequests] = useState<ChangeRequest[]>([])

  useEffect(() => subscribeNotes(atome.id, start, end, setNotes, () => setNotes([])), [atome.id, start, end])
  useEffect(() => subscribeOpenChangeRequests(atome.id, setRequests, () => setRequests([])), [atome.id])

  const pendingByDate = useMemo(() => {
    const map = new Map<IsoDate, ChangeRequest[]>()
    for (const r of requests) {
      if (!isAwaitingDecision(r.status)) continue
      for (const d of r.dates) map.set(d, [...(map.get(d) ?? []), r])
    }
    return map
  }, [requests])

  const notesByDate = useMemo(() => {
    const map = new Map<IsoDate, DayNote[]>()
    for (const n of notes) map.set(n.date, [...(map.get(n.date) ?? []), n])
    return map
  }, [notes])

  return { schedule, requests, pendingByDate, notesByDate, loading, error }
}

/**
 * Actions sur le planning liées à l'utilisateur courant (proposer, arbitrer, noter, générer).
 * Les droits sont vérifiés côté UI et appliqués par `firestore.rules`.
 */
export function useScheduleActions() {
  const { atome, role, household, displayName } = useAtome()
  const { user } = useAuth()
  const uid = user?.uid ?? ''
  const actor: Actor = useMemo(() => ({ uid, name: displayName, role }), [uid, displayName, role])

  const requireParent = useCallback(() => {
    if (!household) throw new Error('Seuls les parents peuvent modifier le planning.')
    return { ...actor, household }
  }, [actor, household])

  return {
    propose: useCallback((draft: ChangeRequestDraft) => proposeChange(atome, requireParent(), draft), [atome, requireParent]),
    act: useCallback(
      (request: ChangeRequest, input: ActOnRequestInput) => actOnChangeRequest(atome, request, requireParent(), input),
      [atome, requireParent],
    ),
    prepareBiffRejection: useCallback(
      (rawReason: string): Promise<string> => {
        requireParent()
        return rewriteReasonToBiff(rawReason)
      },
      [requireParent],
    ),
    addNote: useCallback(
      (dates: IsoDate[], text: string) => {
        if (role === 'neutron') throw new Error('Les neutrons ont un accès en lecture seule.')
        return addNotes(atome, actor, dates, text)
      },
      [atome, actor, role],
    ),
    removeNote: useCallback((noteId: string) => deleteNote(atome.id, noteId), [atome.id]),
    saveGenerated: useCallback(
      (schedule: ScheduleMap): Promise<GenerationReport> => {
        requireParent()
        return saveGeneratedSchedule(atome.id, schedule)
      },
      [atome.id, requireParent],
    ),
  }
}
