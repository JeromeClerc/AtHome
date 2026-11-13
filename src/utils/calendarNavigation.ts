import {
  addDays,
  addMonths,
  addWeeks,
  addYears,
  endOfMonth,
  endOfWeek,
  endOfYear,
  getISOWeek,
  startOfMonth,
  startOfWeek,
  startOfYear,
} from 'date-fns'
import type { IsoDate, NavigationStep } from '@/types'
import { formatFr, fromIsoDate, toIsoDate } from './dates'

export type CalendarViewMode = 'day' | 'week' | 'month' | 'year'

const WEEK_OPTS = { weekStartsOn: 1 } as const

/** Plage visible `[start, end]` (ISO) pour une vue et une date d'ancrage. */
export function visibleRange(view: CalendarViewMode, anchor: IsoDate): { start: IsoDate; end: IsoDate } {
  const d = fromIsoDate(anchor)
  switch (view) {
    case 'day':
      return { start: anchor, end: anchor }
    case 'week':
      return { start: toIsoDate(startOfWeek(d, WEEK_OPTS)), end: toIsoDate(endOfWeek(d, WEEK_OPTS)) }
    case 'month':
      // Grille complète (semaines entières) autour du mois.
      return {
        start: toIsoDate(startOfWeek(startOfMonth(d), WEEK_OPTS)),
        end: toIsoDate(endOfWeek(endOfMonth(d), WEEK_OPTS)),
      }
    case 'year':
      return { start: toIsoDate(startOfYear(d)), end: toIsoDate(endOfYear(d)) }
  }
}

/** Déplace la date d'ancrage d'un pas (jour, semaine, mois, année) dans une direction. */
export function shiftAnchor(anchor: IsoDate, step: NavigationStep, direction: 1 | -1): IsoDate {
  const d = fromIsoDate(anchor)
  switch (step) {
    case 'day':
      return toIsoDate(addDays(d, direction))
    case 'week':
      return toIsoDate(addWeeks(d, direction))
    case 'month':
      return toIsoDate(addMonths(d, direction))
    case 'year':
      return toIsoDate(addYears(d, direction))
  }
}

/** Titre de la période affichée, en français. */
export function periodLabel(view: CalendarViewMode, anchor: IsoDate): string {
  const d = fromIsoDate(anchor)
  switch (view) {
    case 'day':
      return formatFr(d, 'EEEE d MMMM yyyy')
    case 'week': {
      const { start, end } = visibleRange('week', anchor)
      return `Semaine ${getISOWeek(d)} · ${formatFr(start, 'd MMM')} – ${formatFr(end, 'd MMM yyyy')}`
    }
    case 'month':
      return formatFr(d, 'MMMM yyyy')
    case 'year':
      return formatFr(d, 'yyyy')
  }
}

/** Découpe une plage en semaines de 7 jours (pour les grilles). */
export function chunkWeeks(dates: IsoDate[]): IsoDate[][] {
  const weeks: IsoDate[][] = []
  for (let i = 0; i < dates.length; i += 7) weeks.push(dates.slice(i, i + 7))
  return weeks
}

export const WEEKDAY_SHORT = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'] as const
export const WEEKDAY_LETTER = ['L', 'M', 'M', 'J', 'V', 'S', 'D'] as const

export const todayIso = (): IsoDate => toIsoDate(new Date())
