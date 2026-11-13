import type { MouseEvent } from 'react'
import { Clock, Flag } from 'lucide-react'
import type { DayCalendarInfo } from '@/config/vaudCalendar'
import { HOUSEHOLD_STYLES, NOTE_AUTHOR_COLORS } from '@/config/theme'
import type { AtomeRole, ChangeRequest, DayNote, Household, IsoDate, Proton } from '@/types'
import { cn } from '@/utils/cn'
import { formatFr, isWeekend } from '@/utils/dates'

export interface DayCellData {
  date: IsoDate
  info: DayCalendarInfo | undefined
  assignments: Record<string, Household> | undefined
  pending: ChangeRequest[] | undefined
  notes: DayNote[] | undefined
}

interface DayCellProps extends DayCellData {
  protons: Proton[]
  /** Filtre : n'afficher qu'un enfant (null = tous). */
  protonId: string | null
  selected: boolean
  focused: boolean
  isToday: boolean
  outside?: boolean
  variant: 'week' | 'month' | 'mini'
  onClick: (date: IsoDate, e: MouseEvent) => void
}

/** Couleurs des foyers par enfant visible (dans l'ordre des enfants). */
export function householdsFor(assignments: Record<string, Household> | undefined, protons: Proton[], protonId: string | null): Household[] {
  if (!assignments) return []
  const ids = protonId ? [protonId] : protons.map((p) => p.id)
  return ids.map((id) => assignments[id]).filter((h): h is Household => Boolean(h))
}

const WEEKEND_TONE: Record<Household, string> = {
  electron: 'bg-sky-200 dark:bg-sky-800/70',
  positron: 'bg-amber-200 dark:bg-amber-800/60',
}

function custodyClass(h: Household, weekend: boolean): string {
  return weekend ? cn(HOUSEHOLD_STYLES[h].cell, WEEKEND_TONE[h]) : HOUSEHOLD_STYLES[h].cell
}

/** Rôles distincts des auteurs de notes (pour les pastilles de couleur). */
function noteRoles(notes: DayNote[] | undefined): AtomeRole[] {
  return [...new Set((notes ?? []).map((n) => n.authorRole))]
}

/**
 * Cellule d'un jour du planning. Distinctions visuelles :
 * - couleur de fond = foyer de garde (plus soutenue le week-end) ; découpée si les enfants diffèrent ;
 * - jour férié vaudois = numéro rouge + drapeau ; vacances scolaires = barre violette en bas ;
 * - modification en attente = hachures + contour pointillé de la couleur du foyer proposé ;
 * - notes = pastilles de la couleur du rôle de l'auteur.
 */
export function DayCell({ date, info, assignments, pending, notes, protons, protonId, selected, focused, isToday, outside, variant, onClick }: DayCellProps) {
  const weekend = isWeekend(date)
  const households = householdsFor(assignments, protons, protonId)
  const uniform = households.length > 0 && households.every((h) => h === households[0])
  const relevantPending = (pending ?? []).filter((r) => !protonId || r.protonIds.includes(protonId))
  const pendingTarget = relevantPending[0]?.targetHousehold
  const roles = noteRoles(notes)
  const mini = variant === 'mini'

  const titleParts = [formatFr(date, 'EEEE d MMMM yyyy')]
  if (info?.holiday) titleParts.push(`Férié : ${info.holiday.name}`)
  if (info?.schoolHoliday) titleParts.push(`${info.schoolHoliday.name}${info.schoolHoliday.estimated ? ' (estimation)' : ''}`)
  if (households.length) titleParts.push(households.map((h) => HOUSEHOLD_STYLES[h].label).join(' / '))
  if (relevantPending.length) titleParts.push('Modification en attente de validation')
  if (notes?.length) titleParts.push(`${notes.length} note(s)`)

  return (
    <button
      type="button"
      onClick={(e) => onClick(date, e)}
      title={titleParts.join(' · ')}
      aria-pressed={selected}
      aria-label={titleParts.join(', ')}
      className={cn(
        'relative isolate flex w-full overflow-hidden text-left transition',
        mini ? 'aspect-square rounded-[3px] text-[9px]' : 'rounded-lg',
        variant === 'month' && 'min-h-16 flex-col p-1.5 sm:min-h-20',
        variant === 'week' && 'min-h-28 flex-col p-2 sm:min-h-36',
        !households.length && (weekend ? 'bg-slate-200/70 dark:bg-slate-800' : 'bg-white dark:bg-slate-900'),
        uniform && custodyClass(households[0] as Household, weekend),
        !mini && 'border border-slate-200 dark:border-slate-800',
        outside && 'opacity-40',
        relevantPending.length > 0 && 'outline-2 -outline-offset-2 outline-dashed',
        pendingTarget === 'electron' && 'outline-sky-600',
        pendingTarget === 'positron' && 'outline-amber-600',
        selected && 'ring-2 ring-brand-600 ring-offset-1 ring-offset-white dark:ring-offset-slate-950',
        focused && !selected && 'ring-2 ring-slate-400',
        'hover:brightness-95 dark:hover:brightness-110',
      )}
    >
      {/* Découpage par enfant si les attributions diffèrent */}
      {!uniform && households.length > 0 && (
        <span className="absolute inset-0 -z-10 flex" aria-hidden>
          {households.map((h, i) => (
            <span key={i} className={cn('flex-1', custodyClass(h, weekend))} />
          ))}
        </span>
      )}
      {relevantPending.length > 0 && <span className="stripes-pending absolute inset-0 -z-[5]" aria-hidden />}
      {info?.schoolHoliday && (
        <span className={cn('absolute inset-x-0 bottom-0 bg-violet-500', mini ? 'h-[2px]' : 'h-1')} aria-hidden />
      )}

      {mini ? (
        <>
          {info?.holiday && <span className="absolute inset-x-0 top-0 h-[2px] bg-rose-600" aria-hidden />}
          {roles.length > 0 && <span className="absolute right-[1px] top-[1px] h-1 w-1 rounded-full bg-fuchsia-600" aria-hidden />}
        </>
      ) : (
        <>
          <span className="flex w-full items-start justify-between gap-1">
            <span
              className={cn(
                'inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1 text-xs',
                weekend && 'font-bold',
                info?.holiday && 'text-rose-600 dark:text-rose-400 font-bold',
                isToday && 'bg-slate-900 text-white dark:bg-white dark:text-slate-900',
              )}
            >
              {variant === 'week' ? formatFr(date, 'EEE d') : formatFr(date, 'd')}
            </span>
            <span className="flex items-center gap-0.5">
              {relevantPending.length > 0 && <Clock className="h-3.5 w-3.5 text-slate-700 dark:text-slate-200" aria-hidden />}
              {roles.map((r) => (
                <span key={r} className={cn('h-2 w-2 rounded-full', NOTE_AUTHOR_COLORS[r].dot)} aria-hidden />
              ))}
            </span>
          </span>
          {info?.holiday && (
            <span className="mt-0.5 flex items-center gap-1 truncate text-[10px] font-medium text-rose-700 dark:text-rose-300">
              <Flag className="h-3 w-3 shrink-0" aria-hidden />
              <span className="truncate">{info.holiday.name}</span>
            </span>
          )}
          {variant === 'week' && (
            <span className="mt-auto space-y-0.5 text-[11px]">
              {protons
                .filter((p) => !protonId || p.id === protonId)
                .map((p) => {
                  const h = assignments?.[p.id]
                  return (
                    <span key={p.id} className="flex items-center gap-1 truncate">
                      <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', h ? HOUSEHOLD_STYLES[h].dot : 'bg-slate-300')} />
                      <span className="truncate">
                        {p.firstName} · {h ? HOUSEHOLD_STYLES[h].label : '—'}
                      </span>
                    </span>
                  )
                })}
              {notes?.[0] && <span className="block truncate italic opacity-80">« {notes[0].text} »</span>}
            </span>
          )}
        </>
      )}
    </button>
  )
}
