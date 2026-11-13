import { addDays, differenceInCalendarDays, format, isValid, parseISO } from 'date-fns'
import { fr } from 'date-fns/locale'
import type { IsoDate } from '@/types'

/** Convertit une `Date` locale en chaîne ISO `yyyy-MM-dd`. */
export function toIsoDate(date: Date): IsoDate {
  return format(date, 'yyyy-MM-dd')
}

/** Convertit une chaîne `yyyy-MM-dd` en `Date` locale (minuit). */
export function fromIsoDate(iso: IsoDate): Date {
  return parseISO(iso)
}

export function isIsoDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && isValid(parseISO(value))
}

/** Format suisse `JJ.MM.AAAA`. */
export function formatSwiss(date: Date | IsoDate): string {
  const d = typeof date === 'string' ? fromIsoDate(date) : date
  return format(d, 'dd.MM.yyyy')
}

/** Format libre localisé en français. */
export function formatFr(date: Date | IsoDate, pattern: string): string {
  const d = typeof date === 'string' ? fromIsoDate(date) : date
  return format(d, pattern, { locale: fr })
}

/** Liste toutes les dates ISO entre `start` et `end` (inclus). */
export function eachIsoDate(start: IsoDate, end: IsoDate): IsoDate[] {
  const s = fromIsoDate(start)
  const total = differenceInCalendarDays(fromIsoDate(end), s)
  const result: IsoDate[] = []
  for (let i = 0; i <= total; i += 1) result.push(toIsoDate(addDays(s, i)))
  return result
}

export function addIsoDays(iso: IsoDate, amount: number): IsoDate {
  return toIsoDate(addDays(fromIsoDate(iso), amount))
}

/** Jour ISO de la semaine : 1 = lundi … 7 = dimanche. */
export function isoWeekday(iso: IsoDate): number {
  const day = fromIsoDate(iso).getDay()
  return day === 0 ? 7 : day
}

export function isWeekend(iso: IsoDate): boolean {
  return isoWeekday(iso) >= 6
}

/**
 * Regroupe des dates ISO en plages contiguës, pour un affichage compact
 * (ex. « 03.04.2026 → 06.04.2026, 12.04.2026 »).
 */
export function groupContiguous(dates: IsoDate[]): Array<[IsoDate, IsoDate]> {
  const sorted = [...new Set(dates)].sort()
  const ranges: Array<[IsoDate, IsoDate]> = []
  for (const d of sorted) {
    const last = ranges[ranges.length - 1]
    if (last && addIsoDays(last[1], 1) === d) last[1] = d
    else ranges.push([d, d])
  }
  return ranges
}

export function formatDateRanges(dates: IsoDate[]): string {
  return groupContiguous(dates)
    .map(([a, b]) => (a === b ? formatSwiss(a) : `${formatSwiss(a)} → ${formatSwiss(b)}`))
    .join(', ')
}
