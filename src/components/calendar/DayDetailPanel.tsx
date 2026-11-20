import { Flag, MessageSquarePlus, Palmtree, Trash2 } from 'lucide-react'
import { Button, Card } from '@/components/ui'
import type { DayCalendarInfo } from '@/config/vaudCalendar'
import { HOUSEHOLD_STYLES, NOTE_AUTHOR_COLORS, protonColor } from '@/config/theme'
import { useAtome } from '@/hooks/useAtome'
import { useAuth } from '@/hooks/useAuth'
import type { ChangeRequest, DayNote, Household, IsoDate } from '@/types'
import { cn } from '@/utils/cn'
import { formatFr } from '@/utils/dates'
import { RequestCard } from './RequestCard'

interface Props {
  date: IsoDate
  info: DayCalendarInfo | undefined
  assignments: Record<string, Household> | undefined
  notes: DayNote[]
  requests: ChangeRequest[]
  highlightedRequestId: string | null
  onAddNote: () => void
  onDeleteNote: (id: string) => void
}

/** Détail d'un jour : garde par enfant, infos calendaires, notes et demandes en cours. */
export function DayDetailPanel({ date, info, assignments, notes, requests, highlightedRequestId, onAddNote, onDeleteNote }: Props) {
  const { atome, protons, role } = useAtome()
  const { user } = useAuth()

  return (
    <Card className="p-4">
      <h3 className="text-base font-semibold capitalize">{formatFr(date, 'EEEE d MMMM yyyy')}</h3>
      <div className="mt-2 flex flex-wrap gap-2 text-xs">
        {info?.holiday && (
          <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-rose-800 dark:bg-rose-900/50 dark:text-rose-200">
            <Flag className="h-3 w-3" /> {info.holiday.name}
          </span>
        )}
        {info?.schoolHoliday && (
          <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2 py-0.5 text-violet-800 dark:bg-violet-900/50 dark:text-violet-200">
            <Palmtree className="h-3 w-3" /> {info.schoolHoliday.name}
            {info.schoolHoliday.estimated && ' (estimation)'}
          </span>
        )}
      </div>

      <ul className="mt-3 space-y-1.5">
        {protons.map((p) => {
          const h = assignments?.[p.id]
          return (
            <li key={p.id} className="flex items-center justify-between gap-2 text-sm">
              <span className="inline-flex items-center gap-2">
                <span className={cn('h-2.5 w-2.5 rounded-full', protonColor(p.colorIndex))} />
                {p.firstName}
              </span>
              {h ? (
                <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', HOUSEHOLD_STYLES[h].cell)}>
                  {atome.households[h].label || HOUSEHOLD_STYLES[h].label}
                </span>
              ) : (
                <span className="text-xs text-slate-400">Non planifié</span>
              )}
            </li>
          )
        })}
        {protons.length === 0 && <li className="text-sm text-slate-500">Aucun enfant enregistré.</li>}
      </ul>

      <div className="mt-4 flex items-center justify-between">
        <h4 className="text-sm font-semibold">Notes</h4>
        {role !== 'neutron' && (
          <Button size="sm" variant="ghost" icon={<MessageSquarePlus className="h-4 w-4" />} onClick={onAddNote}>
            Ajouter
          </Button>
        )}
      </div>
      {notes.length === 0 ? (
        <p className="text-sm text-slate-500">Aucune note.</p>
      ) : (
        <ul className="mt-1 space-y-2">
          {notes.map((n) => (
            <li key={n.id} className={cn('rounded-lg border-l-4 bg-slate-50 px-3 py-2 text-sm dark:bg-slate-800/60', NOTE_AUTHOR_COLORS[n.authorRole].border)}>
              <p className="whitespace-pre-wrap">{n.text}</p>
              <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
                <span>
                  {n.authorName} · {NOTE_AUTHOR_COLORS[n.authorRole].label}
                </span>
                {n.authorUid === user?.uid && (
                  <button type="button" onClick={() => onDeleteNote(n.id)} className="rounded p-1 hover:bg-slate-200 dark:hover:bg-slate-700" aria-label="Supprimer la note">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {requests.length > 0 && (
        <>
          <h4 className="mt-4 text-sm font-semibold">Demandes en cours</h4>
          <div className="mt-2 space-y-2">
            {requests.map((r) => (
              <RequestCard key={r.id} request={r} highlighted={r.id === highlightedRequestId} />
            ))}
          </div>
        </>
      )}
    </Card>
  )
}
