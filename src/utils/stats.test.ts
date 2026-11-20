import { describe, expect, it } from 'vitest'
import { generateSchedule } from './scheduleGenerator'
import { computeAverageAnnualStats, computeMajorHolidays, computeStats, percent } from './stats'

describe('computeStats', () => {
  const schedule = generateSchedule({
    startDate: '2026-01-05',
    endDate: '2026-12-27',
    pattern: 'weekly',
    firstHousehold: 'electron',
    protonIds: ['a', 'b'],
  })

  it('compte les jours par enfant', () => {
    const s = computeStats(schedule, '2026-01-01', '2026-12-31', 'a')
    expect(s.all.total).toBe(357)
    expect(s.all.electron + s.all.positron).toBe(357)
    // 1er et 2 janvier hors période ; 1er août tombe un samedi mais reste férié.
    expect(s.publicHolidays.total).toBe(7)
    expect(s.schoolHolidays.total).toBeGreaterThan(60)
  })

  it("calcule la moyenne des enfants sur le vrai nombre de jours de l'année (sans additionner les enfants)", () => {
    const s = computeStats(schedule, '2026-01-01', '2026-12-31')
    expect(s.all.total).toBe(357)
    expect(s.all.electron + s.all.positron).toBe(357)
    expect(s.publicHolidays.total).toBe(7)
  })

  it('percent', () => {
    expect(percent(1, 3)).toBe(33)
    expect(percent(0, 0)).toBe(0)
  })

  it('calcule les 3 fêtes majeures (Pâques, Noël 24-25.12, Nouvel An 31.12-01.01) et affiche les deux foyers si partagé', () => {
    const withBlocks = generateSchedule({
      startDate: '2025-12-20',
      endDate: '2027-01-05',
      pattern: 'weekly',
      firstHousehold: 'electron',
      protonIds: ['a', 'b'],
      applyHolidayBlocks: true,
      evenYearHolidayHousehold: 'electron',
    })
    const milestones = computeMajorHolidays(withBlocks, 2026)
    expect(milestones.find((m) => m.key === 'paques')?.households).toEqual(['electron'])
    expect(milestones.find((m) => m.key === 'noel')?.households).toEqual(['electron'])
    expect(milestones.find((m) => m.key === 'nouvel_an')?.households).toEqual(['positron'])

    // Si le 24.12 est attribué à Positron et le 25.12 à Électron, affiche les deux foyers
    withBlocks['2026-12-24'] = { a: 'positron', b: 'positron' }
    withBlocks['2026-12-25'] = { a: 'electron', b: 'electron' }
    const splitNoel = computeMajorHolidays(withBlocks, 2026).find((m) => m.key === 'noel')
    expect(splitNoel?.household).toBe('mixed')
    expect(splitNoel?.households).toEqual(['electron', 'positron'])
  })

  it('calcule la moyenne annuelle des statistiques sur une période pluriannuelle (ex. 2026-2027)', () => {
    const multiYear = generateSchedule({
      startDate: '2026-01-01',
      endDate: '2027-12-31',
      pattern: 'weekly',
      firstHousehold: 'electron',
      protonIds: ['a', 'b'],
      applyHolidayBlocks: true,
      evenYearHolidayHousehold: 'electron',
    })
    const avg = computeAverageAnnualStats(multiYear, 2026, 2027)
    expect(avg.yearsCount).toBe(2)
    expect(avg.stats.all.total).toBe(365)
    expect(avg.stats.publicHolidays.total).toBe(9)
    expect(Math.round(avg.stats.all.electron + avg.stats.all.positron)).toBe(365)
  })
})
