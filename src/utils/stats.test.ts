import { describe, expect, it } from 'vitest'
import { generateSchedule } from './scheduleGenerator'
import { computeMajorHolidays, computeStats, percent } from './stats'

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

  it("compte les jours-enfants si aucun enfant n'est filtré", () => {
    expect(computeStats(schedule, '2026-01-01', '2026-12-31').all.total).toBe(714)
  })

  it('percent', () => {
    expect(percent(1, 3)).toBe(33)
    expect(percent(0, 0)).toBe(0)
  })

  it('calcule les 3 fêtes majeures (Pâques, Noël, Nouvel An) selon le planning actif', () => {
    const withBlocks = generateSchedule({
      startDate: '2025-12-20',
      endDate: '2026-12-31',
      pattern: 'weekly',
      firstHousehold: 'electron',
      protonIds: ['a', 'b'],
      applyHolidayBlocks: true,
      evenYearHolidayHousehold: 'electron',
    })
    const milestones = computeMajorHolidays(withBlocks, 2026)
    expect(milestones).toEqual([
      { key: 'paques', label: 'Pâques', date: '2026-04-05', household: 'electron' },
      { key: 'noel', label: 'Noël', date: '2026-12-25', household: 'electron' },
      { key: 'nouvel_an', label: 'Nouvel An', date: '2026-01-01', household: 'electron' },
    ])

    // Simulation d'un échange validé sur Noël pour l'enfant 'a' uniquement
    withBlocks['2026-12-25'] = { a: 'positron', b: 'electron' }
    expect(computeMajorHolidays(withBlocks, 2026).find((m) => m.key === 'noel')?.household).toBe('mixed')
    expect(computeMajorHolidays(withBlocks, 2026, 'a').find((m) => m.key === 'noel')?.household).toBe('positron')
  })
})
