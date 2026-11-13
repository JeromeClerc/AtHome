/**
 * Calendrier officiel du Canton de Vaud : jours fériés et vacances scolaires.
 *
 * - Les jours fériés sont **calculés** pour n'importe quelle année (algorithme de Pâques).
 * - Les vacances scolaires sont fixées par le Département (DEF). Les années connues sont saisies dans
 *   `OFFICIAL_SCHOOL_HOLIDAYS` (source : vd.ch, « calendrier des vacances scolaires 2023-2031 »).
 *   Pour les autres années, une **estimation** est calculée et signalée par `estimated: true`.
 *   → Mettre à jour la table chaque année.
 */
import { addDays } from 'date-fns'
import type { IsoDate } from '@/types'
import { addIsoDays, eachIsoDate, fromIsoDate, isoWeekday, toIsoDate } from '@/utils/dates'

export interface PublicHoliday {
  date: IsoDate
  name: string
}

export type SchoolHolidayKind = 'automne' | 'noel' | 'relaches' | 'paques' | 'ascension' | 'ete'

export interface SchoolHolidayPeriod {
  kind: SchoolHolidayKind
  name: string
  start: IsoDate
  end: IsoDate
  /** true si la période est une estimation (année non publiée dans la table officielle). */
  estimated: boolean
}

/**
 * Calcule le dimanche de Pâques (calendrier grégorien) par l'algorithme de Meeus/Jones/Butcher.
 * @param year Année grégorienne.
 * @returns Date locale du dimanche de Pâques.
 */
export function easterSunday(year: number): Date {
  const a = year % 19
  const b = Math.floor(year / 100)
  const c = year % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const month = Math.floor((h + l - 7 * m + 114) / 31)
  const day = ((h + l - 7 * m + 114) % 31) + 1
  return new Date(year, month - 1, day)
}

/**
 * Lundi du Jeûne fédéral : lundi qui suit le 3e dimanche de septembre.
 */
export function federalFastMonday(year: number): Date {
  const sept1 = new Date(year, 8, 1)
  const firstSundayOffset = (7 - sept1.getDay()) % 7
  const thirdSunday = addDays(sept1, firstSundayOffset + 14)
  return addDays(thirdSunday, 1)
}

/** Jours fériés officiels du Canton de Vaud pour une année donnée, triés par date. */
export function getVaudPublicHolidays(year: number): PublicHoliday[] {
  const easter = easterSunday(year)
  const list: PublicHoliday[] = [
    { date: toIsoDate(new Date(year, 0, 1)), name: 'Nouvel An' },
    { date: toIsoDate(new Date(year, 0, 2)), name: 'Saint-Berchtold' },
    { date: toIsoDate(addDays(easter, -2)), name: 'Vendredi saint' },
    { date: toIsoDate(addDays(easter, 1)), name: 'Lundi de Pâques' },
    { date: toIsoDate(addDays(easter, 39)), name: 'Ascension' },
    { date: toIsoDate(addDays(easter, 50)), name: 'Lundi de Pentecôte' },
    { date: toIsoDate(new Date(year, 7, 1)), name: 'Fête nationale' },
    { date: toIsoDate(federalFastMonday(year)), name: 'Lundi du Jeûne fédéral' },
    { date: toIsoDate(new Date(year, 11, 25)), name: 'Noël' },
  ]
  return list.sort((x, y) => x.date.localeCompare(y.date))
}

type PeriodSeed = Omit<SchoolHolidayPeriod, 'estimated'>

/**
 * Vacances scolaires officielles, indexées par **année scolaire de début** (2025 = 2025-2026).
 * Source : https://www.vd.ch (calendrier des vacances scolaires 2023-2031).
 */
export const OFFICIAL_SCHOOL_HOLIDAYS: Record<number, PeriodSeed[]> = {
  2025: [
    { kind: 'automne', name: "Vacances d'automne", start: '2025-10-11', end: '2025-10-26' },
    { kind: 'noel', name: "Vacances d'hiver", start: '2025-12-20', end: '2026-01-04' },
    { kind: 'relaches', name: 'Relâches', start: '2026-02-14', end: '2026-02-22' },
    { kind: 'paques', name: 'Vacances de Pâques', start: '2026-04-03', end: '2026-04-19' },
    { kind: 'ascension', name: "Pont de l'Ascension", start: '2026-05-14', end: '2026-05-17' },
    { kind: 'ete', name: "Vacances d'été", start: '2026-06-27', end: '2026-08-16' },
  ],
  2026: [
    { kind: 'automne', name: "Vacances d'automne", start: '2026-10-10', end: '2026-10-25' },
    { kind: 'noel', name: "Vacances d'hiver", start: '2026-12-24', end: '2027-01-10' },
    { kind: 'relaches', name: 'Relâches', start: '2027-02-06', end: '2027-02-14' },
    { kind: 'paques', name: 'Vacances de Pâques', start: '2027-03-26', end: '2027-04-11' },
    { kind: 'ascension', name: "Pont de l'Ascension", start: '2027-05-06', end: '2027-05-09' },
    { kind: 'ete', name: "Vacances d'été", start: '2027-07-03', end: '2027-08-22' },
  ],
}

/** Samedi précédant (ou égal à) la date donnée. */
function saturdayOnOrBefore(iso: IsoDate): IsoDate {
  const wd = isoWeekday(iso)
  return addIsoDays(iso, wd === 7 ? -1 : -((wd + 1) % 7))
}

/**
 * Estimation des vacances scolaires vaudoises pour une année scolaire non publiée.
 * Heuristique basée sur les usages vaudois (2 semaines en octobre, 2 semaines à Noël,
 * 1 semaine de relâches fin février, 2 semaines autour de Pâques, pont de l'Ascension,
 * ~7 semaines d'été dès fin juin / début juillet).
 */
export function estimateSchoolHolidays(schoolYear: number): SchoolHolidayPeriod[] {
  const next = schoolYear + 1
  const easter = toIsoDate(easterSunday(next))
  const ascension = addIsoDays(easter, 39)
  const autumnStart = saturdayOnOrBefore(`${schoolYear}-10-14`)
  const xmasStart = saturdayOnOrBefore(`${schoolYear}-12-24`)
  const relachesStart = saturdayOnOrBefore(`${next}-02-20`)
  const summerStart = saturdayOnOrBefore(`${next}-07-03`)
  const seeds: PeriodSeed[] = [
    { kind: 'automne', name: "Vacances d'automne", start: autumnStart, end: addIsoDays(autumnStart, 15) },
    { kind: 'noel', name: "Vacances d'hiver", start: xmasStart, end: addIsoDays(xmasStart, 15) },
    { kind: 'relaches', name: 'Relâches', start: relachesStart, end: addIsoDays(relachesStart, 8) },
    { kind: 'paques', name: 'Vacances de Pâques', start: addIsoDays(easter, -2), end: addIsoDays(easter, 14) },
    { kind: 'ascension', name: "Pont de l'Ascension", start: ascension, end: addIsoDays(ascension, 3) },
    { kind: 'ete', name: "Vacances d'été", start: summerStart, end: addIsoDays(summerStart, 50) },
  ]
  return seeds.map((s) => ({ ...s, estimated: true }))
}

/** Vacances scolaires d'une année scolaire (officielles si disponibles, sinon estimées). */
export function getSchoolHolidaysForSchoolYear(schoolYear: number): SchoolHolidayPeriod[] {
  const official = OFFICIAL_SCHOOL_HOLIDAYS[schoolYear]
  if (official) return official.map((p) => ({ ...p, estimated: false }))
  return estimateSchoolHolidays(schoolYear)
}

/** Toutes les périodes de vacances qui intersectent l'année civile donnée. */
export function getVaudSchoolHolidays(year: number): SchoolHolidayPeriod[] {
  return [...getSchoolHolidaysForSchoolYear(year - 1), ...getSchoolHolidaysForSchoolYear(year)].filter(
    (p) => p.start <= `${year}-12-31` && p.end >= `${year}-01-01`,
  )
}

export interface DayCalendarInfo {
  holiday: PublicHoliday | null
  schoolHoliday: SchoolHolidayPeriod | null
}

/**
 * Index rapide (date → infos calendaires) pour une plage de dates.
 * Utilisé par les vues calendrier et les statistiques.
 */
export function buildCalendarIndex(start: IsoDate, end: IsoDate): Map<IsoDate, DayCalendarInfo> {
  const startYear = fromIsoDate(start).getFullYear()
  const endYear = fromIsoDate(end).getFullYear()
  const holidays = new Map<IsoDate, PublicHoliday>()
  const school = new Map<IsoDate, SchoolHolidayPeriod>()
  for (let y = startYear; y <= endYear; y += 1) {
    for (const h of getVaudPublicHolidays(y)) holidays.set(h.date, h)
    for (const p of getVaudSchoolHolidays(y)) {
      for (const d of eachIsoDate(p.start, p.end)) if (!school.has(d)) school.set(d, p)
    }
  }
  const index = new Map<IsoDate, DayCalendarInfo>()
  for (const d of eachIsoDate(start, end)) {
    index.set(d, { holiday: holidays.get(d) ?? null, schoolHoliday: school.get(d) ?? null })
  }
  return index
}

export function isVaudPublicHoliday(iso: IsoDate): boolean {
  return getVaudPublicHolidays(fromIsoDate(iso).getFullYear()).some((h) => h.date === iso)
}
