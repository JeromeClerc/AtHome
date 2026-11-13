import { describe, expect, it } from 'vitest'
import {
  buildCalendarIndex,
  easterSunday,
  estimateSchoolHolidays,
  federalFastMonday,
  getSchoolHolidaysForSchoolYear,
  getVaudPublicHolidays,
  getVaudSchoolHolidays,
} from './vaudCalendar'
import { toIsoDate } from '@/utils/dates'

describe('easterSunday', () => {
  it.each([
    [2024, '2024-03-31'],
    [2025, '2025-04-20'],
    [2026, '2026-04-05'],
    [2027, '2027-03-28'],
    [2038, '2038-04-25'],
  ])('Pâques %i = %s', (year, expected) => {
    expect(toIsoDate(easterSunday(year))).toBe(expected)
  })
})

describe('federalFastMonday', () => {
  it.each([
    [2025, '2025-09-22'],
    [2026, '2026-09-21'],
    [2027, '2027-09-20'],
  ])('Jeûne fédéral %i = %s', (year, expected) => {
    expect(toIsoDate(federalFastMonday(year))).toBe(expected)
  })
})

describe('getVaudPublicHolidays', () => {
  it('liste les 9 jours fériés vaudois de 2026', () => {
    expect(getVaudPublicHolidays(2026).map((h) => h.date)).toEqual([
      '2026-01-01',
      '2026-01-02',
      '2026-04-03',
      '2026-04-06',
      '2026-05-14',
      '2026-05-25',
      '2026-08-01',
      '2026-09-21',
      '2026-12-25',
    ])
  })
})

describe('vacances scolaires', () => {
  it('utilise la table officielle quand elle existe', () => {
    const periods = getSchoolHolidaysForSchoolYear(2025)
    expect(periods.every((p) => !p.estimated)).toBe(true)
    expect(periods.find((p) => p.kind === 'relaches')).toMatchObject({ start: '2026-02-14', end: '2026-02-22' })
  })

  it('estime les années non publiées (samedi → dimanche)', () => {
    const periods = estimateSchoolHolidays(2030)
    expect(periods.every((p) => p.estimated)).toBe(true)
    for (const p of periods.filter((x) => x.kind !== 'paques' && x.kind !== 'ascension')) {
      expect(new Date(`${p.start}T00:00:00`).getDay()).toBe(6)
      expect(new Date(`${p.end}T00:00:00`).getDay()).toBe(0)
    }
  })

  it("couvre les périodes à cheval sur l'année civile", () => {
    const kinds = getVaudSchoolHolidays(2026).map((p) => `${p.kind}:${p.start}`)
    expect(kinds).toContain('noel:2025-12-20')
    expect(kinds).toContain('noel:2026-12-24')
  })

  it('construit un index jour par jour', () => {
    const index = buildCalendarIndex('2026-04-01', '2026-04-07')
    expect(index.get('2026-04-03')?.holiday?.name).toBe('Vendredi saint')
    expect(index.get('2026-04-02')?.schoolHoliday).toBeNull()
    expect(index.get('2026-04-04')?.schoolHoliday?.kind).toBe('paques')
  })
})
