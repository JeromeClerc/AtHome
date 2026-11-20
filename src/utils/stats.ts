import { buildCalendarIndex, easterSunday } from '@/config/vaudCalendar'
import type { Household, IsoDate, ScheduleMap } from '@/types'
import { formatFr, toIsoDate } from './dates'

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
  /** Date principale (ISO) du jalon. */
  date: IsoDate
  /** Jours évalués pour ce jalon (ex. 24 et 25.12 pour Noël ; 31.12 et 01.01 pour Nouvel An). */
  dates: IsoDate[]
  /** Libellé court des dates affichées (ex. « 05.04 », « 24–25.12 », « 31.12–01.01 »). */
  dateLabel: string
  /** Foyer unique si tous les jours/enfants du jalon sont chez le même parent, 'mixed' si les deux foyers interviennent, null si non planifié. */
  household: MajorHolidayAssignment
  /** Liste des foyers accueillant les enfants sur ce jalon (1 ou 2 foyers, ou vide si non planifié). */
  households: Household[]
}

const empty = (): SplitCount => ({ electron: 0, positron: 0, total: 0 })

/**
 * Ajoute un jour calendaire aux compteurs en faisant la moyenne des enfants de l'Atome
 * (le total reste ainsi exprimé en vrais jours calendaires : 365/366 j par an, 9 fériés, etc.).
 */
function addDayAverage(count: SplitCount, entries: Household[]): void {
  if (entries.length === 0) return
  const weight = 1 / entries.length
  for (const h of entries) {
    count[h] += weight
  }
  count.total += 1
}

function roundSplit(count: SplitCount): SplitCount {
  return {
    electron: Math.round(count.electron * 10) / 10,
    positron: Math.round(count.positron * 10) / 10,
    total: count.total,
  }
}

/** Pourcentage arrondi (0 si total nul). */
export function percent(part: number, total: number): number {
  return total === 0 ? 0 : Math.round((part / total) * 100)
}

/**
 * Calcule la répartition des jours calendaires entre les deux foyers sur une période.
 *
 * - Si `protonId` est fourni, seuls les jours de cet enfant sont comptés.
 * - Si `protonId` est `null` (« Tous les enfants »), chaque date compte pour **1 jour calendaire**
 *   (sur 365/366 jours par an) en prenant la moyenne des enfants de l'Atome ce jour-là.
 */
export function computeStats(schedule: ScheduleMap, start: IsoDate, end: IsoDate, protonId?: string | null): CustodyStats {
  const index = buildCalendarIndex(start, end)
  const raw: CustodyStats = { all: empty(), publicHolidays: empty(), schoolHolidays: empty(), weekends: empty() }
  for (const [date, info] of index) {
    const assignments = schedule[date]
    if (!assignments) continue
    const entries = protonId ? (assignments[protonId] ? [assignments[protonId]] : []) : Object.values(assignments)
    if (entries.length === 0) continue
    const weekday = new Date(`${date}T00:00:00`).getDay()
    addDayAverage(raw.all, entries)
    if (info.holiday) addDayAverage(raw.publicHolidays, entries)
    if (info.schoolHoliday) addDayAverage(raw.schoolHolidays, entries)
    if (weekday === 0 || weekday === 6) addDayAverage(raw.weekends, entries)
  }
  return {
    all: roundSplit(raw.all),
    publicHolidays: roundSplit(raw.publicHolidays),
    schoolHolidays: roundSplit(raw.schoolHolidays),
    weekends: roundSplit(raw.weekends),
  }
}

/**
 * Calcule la moyenne annuelle des statistiques de répartition (Jours totaux, Vacances scolaires,
 * Jours fériés, Week-ends) sur une plage d'années `[startYear, endYear]`.
 *
 * Pour chaque statistique : `(valeur année 1 + valeur année 2 + ...) / nombre d'années planifiées`.
 * Les pourcentages correspondent ainsi à la moyenne sur l'ensemble de la période générée.
 */
export function computeAverageAnnualStats(
  schedule: ScheduleMap,
  startYear: number,
  endYear: number,
  protonId?: string | null,
): { stats: CustodyStats; yearsCount: number } {
  const yearly: CustodyStats[] = []
  for (let y = startYear; y <= endYear; y += 1) {
    const s = computeStats(schedule, `${y}-01-01`, `${y}-12-31`, protonId)
    if (s.all.total > 0) yearly.push(s)
  }
  const n = yearly.length
  if (n === 0) {
    return {
      stats: { all: empty(), publicHolidays: empty(), schoolHolidays: empty(), weekends: empty() },
      yearsCount: 0,
    }
  }
  const avgCategory = (pick: (s: CustodyStats) => SplitCount): SplitCount => {
    let sumE = 0
    let sumP = 0
    let sumT = 0
    for (const s of yearly) {
      const c = pick(s)
      sumE += c.electron
      sumP += c.positron
      sumT += c.total
    }
    return roundSplit({
      electron: sumE / n,
      positron: sumP / n,
      total: Math.round((sumT / n) * 10) / 10,
    })
  }
  return {
    stats: {
      all: avgCategory((s) => s.all),
      publicHolidays: avgCategory((s) => s.publicHolidays),
      schoolHolidays: avgCategory((s) => s.schoolHolidays),
      weekends: avgCategory((s) => s.weekends),
    },
    yearsCount: n,
  }
}

function resolveDatesAssignment(
  schedule: ScheduleMap,
  dates: IsoDate[],
  protonId?: string | null,
): { household: MajorHolidayAssignment; households: Household[] } {
  const found = new Set<Household>()
  for (const date of dates) {
    const assignments = schedule[date]
    if (!assignments) continue
    const values = protonId ? (assignments[protonId] ? [assignments[protonId]] : []) : Object.values(assignments)
    for (const h of values) found.add(h)
  }
  const households = (['electron', 'positron'] as const).filter((h) => found.has(h))
  if (households.length === 0) return { household: null, households: [] }
  if (households.length === 1) return { household: households[0] as Household, households }
  return { household: 'mixed', households }
}

/**
 * Calcule l'attribution de garde sur les 3 fêtes majeures pivots d'une année civile :
 * 1. Pâques (dimanche de Pâques)
 * 2. Noël (24 et 25 décembre : affiche le foyer si identique sur les 2 jours, ou les deux foyers s'ils diffèrent)
 * 3. Nouvel An (31 décembre et 1er janvier : affiche le foyer si identique sur les 2 jours, ou les deux foyers s'ils diffèrent)
 *
 * Reflète le planning actif (y compris les échanges validés).
 */
export function computeMajorHolidays(
  schedule: ScheduleMap,
  year: number,
  protonId?: string | null,
): MajorHolidayMilestone[] {
  const easterIso = toIsoDate(easterSunday(year))
  const christmasDates: IsoDate[] = [`${year}-12-24`, `${year}-12-25`]

  // Pour Nouvel An, on privilégie le passage 31.12.<year> → 01.01.<year+1> (fêtes de fin d'année de <year>),
  // avec repli sur 31.12.<year-1> → 01.01.<year> si la fin d'année <year> n'est pas encore planifiée.
  const endOfYearNewYearDates: IsoDate[] = [`${year}-12-31`, `${year + 1}-01-01`]
  const startOfYearNewYearDates: IsoDate[] = [`${year - 1}-12-31`, `${year}-01-01`]
  const endOfYearResolved = resolveDatesAssignment(schedule, endOfYearNewYearDates, protonId)
  const useEndOfYear = endOfYearResolved.households.length > 0 || !(schedule[`${year}-01-01`] || schedule[`${year - 1}-12-31`])
  const newYearDates = useEndOfYear ? endOfYearNewYearDates : startOfYearNewYearDates
  const newYearResolved = useEndOfYear ? endOfYearResolved : resolveDatesAssignment(schedule, startOfYearNewYearDates, protonId)

  const easterResolved = resolveDatesAssignment(schedule, [easterIso], protonId)
  const christmasResolved = resolveDatesAssignment(schedule, christmasDates, protonId)

  return [
    {
      key: 'paques',
      label: 'Pâques',
      date: easterIso,
      dates: [easterIso],
      dateLabel: formatFr(easterIso, 'dd.MM'),
      ...easterResolved,
    },
    {
      key: 'noel',
      label: 'Noël',
      date: `${year}-12-25`,
      dates: christmasDates,
      dateLabel: '24–25.12',
      ...christmasResolved,
    },
    {
      key: 'nouvel_an',
      label: 'Nouvel An',
      date: newYearDates[0] as IsoDate,
      dates: newYearDates,
      dateLabel: '31.12–01.01',
      ...newYearResolved,
    },
  ]
}
