import { describe, expect, it } from 'vitest'
import type { Household } from '@/types'
import { applyHolidayBridges, buildCycle, generateSchedule, parseCustomCycle } from './scheduleGenerator'
import { eachIsoDate } from './dates'

const P = ['p1']

describe('buildCycle', () => {
  it('semaine A/B = 7 jours chacun', () => {
    const c = buildCycle('weekly', 'electron')
    expect(c).toHaveLength(14)
    expect(c.filter((h) => h === 'electron')).toHaveLength(7)
  })
  it('2-2-3 est équilibré sur 14 jours', () => {
    const c = buildCycle('two-two-three', 'positron')
    expect(c.filter((h) => h === 'positron')).toHaveLength(7)
    expect(c[0]).toBe('positron')
  })
  it('refuse un cycle personnalisé vide', () => {
    expect(() => buildCycle('custom', 'electron', [])).toThrow()
  })
})

describe('generateSchedule', () => {
  it('alterne semaine A / semaine B (sans ponts)', () => {
    const s = generateSchedule({
      startDate: '2026-01-05',
      endDate: '2026-01-18',
      pattern: 'weekly',
      firstHousehold: 'electron',
      protonIds: P,
      applyHolidayBridges: false,
    })
    expect(Object.keys(s)).toHaveLength(14)
    expect(s['2026-01-05']?.p1).toBe('electron')
    expect(s['2026-01-11']?.p1).toBe('electron')
    expect(s['2026-01-12']?.p1).toBe('positron')
    expect(s['2026-01-18']?.p1).toBe('positron')
  })

  it('attribue chaque enfant sélectionné', () => {
    const s = generateSchedule({
      startDate: '2026-03-02',
      endDate: '2026-03-02',
      pattern: 'weekly',
      firstHousehold: 'positron',
      protonIds: ['a', 'b'],
    })
    expect(s['2026-03-02']).toEqual({ a: 'positron', b: 'positron' })
  })

  it('Lundi de Pâques rattaché au week-end même si le cycle bascule le lundi', () => {
    const s = generateSchedule({
      startDate: '2026-03-30', // lundi
      endDate: '2026-04-12',
      pattern: 'weekly',
      firstHousehold: 'electron',
      protonIds: P,
    })
    expect(s['2026-04-03']?.p1).toBe('electron') // Vendredi saint, déjà chez le parent du week-end
    expect(s['2026-04-05']?.p1).toBe('electron') // dimanche de Pâques
    expect(s['2026-04-06']?.p1).toBe('electron') // pont : lundi férié chez le parent du dimanche
    expect(s['2026-04-07']?.p1).toBe('positron')
  })

  it('Vendredi saint rattaché au week-end quand le cycle bascule le samedi', () => {
    // 2-2-3 démarrant un lundi : ven. de semaine 1 = A ; on démarre le cycle le mardi 31.03
    // pour que le vendredi 03.04 tombe sur B alors que le samedi 04.04 est A.
    const s = generateSchedule({
      startDate: '2026-03-28', // samedi
      endDate: '2026-04-10',
      pattern: 'custom',
      customCycle: ['electron', 'electron', 'positron', 'positron', 'positron', 'positron', 'positron', 'electron', 'electron', 'electron', 'electron', 'electron', 'electron', 'electron'],
      firstHousehold: 'electron',
      protonIds: P,
    })
    // 03.04 (vendredi) = index 6 → positron dans le cycle ; samedi 04.04 = index 7 → electron.
    expect(s['2026-04-03']?.p1).toBe('electron')
    expect(s['2026-04-02']?.p1).toBe('positron')
  })

  it('applique le pont même sur le premier jour (bord de période)', () => {
    const s = generateSchedule({
      startDate: '2026-04-06', // Lundi de Pâques, début de cycle positron
      endDate: '2026-04-08',
      pattern: 'weekly',
      firstHousehold: 'positron',
      protonIds: P,
    })
    // Le dimanche précédent (hors période) est electron (cycle étendu) → lundi férié electron.
    expect(s['2026-04-06']?.p1).toBe('electron')
    expect(s['2026-04-07']?.p1).toBe('positron')
  })

  it('rejette une période inversée', () => {
    expect(() =>
      generateSchedule({
        startDate: '2026-02-01',
        endDate: '2026-01-01',
        pattern: 'weekly',
        firstHousehold: 'electron',
        protonIds: P,
      }),
    ).toThrow()
  })
})

describe('applyHolidayBridges', () => {
  it('traite un bloc 1er-2 janvier qui tombe jeudi-vendredi', () => {
    // 2026-01-01 jeudi, 02 vendredi, 03-04 week-end positron.
    const days = new Map<string, Household>()
    for (const d of eachIsoDate('2025-12-29', '2026-01-04')) days.set(d, 'electron')
    days.set('2026-01-03', 'positron')
    days.set('2026-01-04', 'positron')
    const changed = applyHolidayBridges(days)
    expect(changed.sort()).toEqual(['2026-01-01', '2026-01-02'])
    expect(days.get('2025-12-31')).toBe('electron')
  })

  it('ignore un férié isolé en milieu de semaine (Ascension, jeudi)', () => {
    const days = new Map<string, Household>()
    for (const d of eachIsoDate('2026-05-11', '2026-05-17')) days.set(d, 'electron')
    days.set('2026-05-16', 'positron')
    expect(applyHolidayBridges(days)).toEqual([])
  })
})

describe('parseCustomCycle', () => {
  it('lit une séquence E/P', () => {
    expect(parseCustomCycle('E, E p')).toEqual(['electron', 'electron', 'positron'])
  })
  it('rejette un symbole inconnu', () => {
    expect(() => parseCustomCycle('E X')).toThrow(/X/)
  })
})
