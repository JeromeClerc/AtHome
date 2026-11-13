import { describe, expect, it } from 'vitest'
import { generateSchedule } from './scheduleGenerator'
import { computeStats, percent } from './stats'

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
})
