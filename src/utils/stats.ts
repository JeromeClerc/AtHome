import { buildCalendarIndex, easterSunday } from '@/config/vaudCalendar'
import type { Household, IsoDate, ScheduleMap } from '@/types'
import { toIsoDate } from './dates'

export interface SplitCount {
  electron: number
  positron: number
  total: number
}

export interface CustodyStats {
  all: SplitCount
  publicHolidays: SplitCount
  schoolHolidays: SplitCount
  weekends: SplitCount
}

export type MajorHolidayKey = 'paques' | 'noel' | 'nouvel_an'

export type MajorHolidayAssignment = Household | 'mixed' | null

export interface MajorHolidayMilestone {
  key: MajorHolidayKey
  label: string
  date: IsoDate
  household: MajorHolidayAssignment
}

const empty = (): SplitCount => ({ electron: 0, positron: 0, total: 0 })

function add(count: SplitCount, h: Household): void {
  count[h] += 1
  count.total += 1
}

/** Pourcentage arrondi (0 si total nul). */
export function percent(part: number, total: number): number {
  return total === 0 ? 0 : Math.round((part / total) * 100)
}

/**
 * Calcule la répartition des jours entre les deux foyers sur une période.
 *
 * Si `protonId` est fourni, seuls les jours de cet enfant sont comptés ; sinon chaque couple
 * (jour, enfant) compte pour un « jour-enfant ».
 */
export function computeStats(schedule: ScheduleMap, start: IsoDate, end: IsoDate, protonId?: string | null): CustodyStats {
  const index = buildCalendarIndex(start, end)
  const stats: CustodyStats = { all: empty(), publicHolidays: empty(), schoolHolidays: empty(), weekends: empty() }
  for (const [date, info] of index) {
    const assignments = schedule[date]
    if (!assignments) continue
    const entries = protonId ? (assignments[protonId] ? [assignments[protonId]] : []) : Object.values(assignments)
    const weekday = new Date(`${date}T00:00:00`).getDay()
    for (const h of entries) {
      add(stats.all, h)
      if (info.holiday) add(stats.publicHolidays, h)
      if (info.schoolHoliday) add(stats.schoolHolidays, h)
      if (weekday === 0 || weekday === 6) add(stats.weekends, h)
    }
  }
  return stats
}

function resolveDayAssignment(schedule: ScheduleMap, date: IsoDate, protonId?: string | null): MajorHolidayAssignment {
  const assignments = schedule[date]
  if (!assignments) return null
  const values = protonId ? (assignments[protonId] ? [assignments[protonId]] : []) : Object.values(assignments)
  if (values.length === 0) return null
  const first = values[0] as Household
  return values.every((h) => h === first) ? first : 'mixed'
}

/**
 * Calcule l'attribution de garde sur les 3 fêtes majeures pivots d'une année civile :
 * 1. Pâques (dimanche de Pâques)
 * 2. Noël (25 décembre)
 * 3. Nouvel An (1er janvier)
 *
 * Reflète le planning actif (y compris les échanges validés).
 */
export function computeMajorHolidays(
  schedule: ScheduleMap,
  year: number,
  protonId?: string | null,
): MajorHolidayMilestone[] {
  const easterIso = toIsoDate(easterSunday(year))
  const christmasIso = `${year}-12-25`
  const newYearIso = `${year}-01-01`

  return [
    { key: 'paques', label: 'Pâques', date: easterIso, household: resolveDayAssignment(schedule, easterIso, protonId) },
    { key: 'noel', label: 'Noël', date: christmasIso, household: resolveDayAssignment(schedule, christmasIso, protonId) },
    { key: 'nouvel_an', label: 'Nouvel An', date: newYearIso, household: resolveDayAssignment(schedule, newYearIso, protonId) },
  ]
}
