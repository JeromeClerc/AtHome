import { describe, expect, it } from 'vitest'
import type { Household } from '@/types'
import {
  applyHolidayBlocks,
  applyHolidayBridges,
  applySummerHolidayBlocks,
  buildCycle,
  generateSchedule,
  getHolidayBlockHouseholds,
  parseCustomCycle,
} from './scheduleGenerator'
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

describe('applyHolidayBlocks & alternance années paires / impaires', () => {
  it('alterne automatiquement années paires et années impaires avec option d’inversion A/B', () => {
    expect(getHolidayBlockHouseholds(2026, 'electron')).toEqual({
      christmas: 'electron',
      newYear: 'positron',
      easter: 'electron',
    })
    expect(getHolidayBlockHouseholds(2027, 'electron')).toEqual({
      christmas: 'positron',
      newYear: 'electron',
      easter: 'positron',
    })
    expect(getHolidayBlockHouseholds(2026, 'positron')).toEqual({
      christmas: 'positron',
      newYear: 'electron',
      easter: 'positron',
    })
  })

  it('applique les blocs Noël / Nouvel An et Pâques sur 2025-2027', () => {
    const s = generateSchedule({
      startDate: '2025-12-20',
      endDate: '2027-04-10',
      pattern: 'weekly',
      firstHousehold: 'electron',
      protonIds: P,
      applyHolidayBlocks: true,
      evenYearHolidayHousehold: 'electron',
    })

    // Fin d'année 2025 (année impaire) : Noël → Positron (B), Nouvel An → Électron (A)
    expect(s['2025-12-24']?.p1).toBe('positron')
    expect(s['2025-12-25']?.p1).toBe('positron')
    expect(s['2025-12-31']?.p1).toBe('electron')
    expect(s['2026-01-01']?.p1).toBe('electron')

    // Pâques 2026 (année paire) : Vendredi saint → Lundi de Pâques → Électron (A)
    expect(s['2026-04-03']?.p1).toBe('electron')
    expect(s['2026-04-05']?.p1).toBe('electron')
    expect(s['2026-04-06']?.p1).toBe('electron')

    // Fin d'année 2026 (année paire) : Noël → Électron (A), Nouvel An → Positron (B)
    expect(s['2026-12-24']?.p1).toBe('electron')
    expect(s['2026-12-25']?.p1).toBe('electron')
    expect(s['2026-12-31']?.p1).toBe('positron')
    expect(s['2027-01-01']?.p1).toBe('positron')

    // Pâques 2027 (année impaire, dimanche 28.03.2027) → Positron (B)
    expect(s['2027-03-26']?.p1).toBe('positron')
    expect(s['2027-03-28']?.p1).toBe('positron')
    expect(s['2027-03-29']?.p1).toBe('positron')
  })

  it('retourne la liste des dates modifiées par applyHolidayBlocks', () => {
    const days = new Map<string, Household>()
    for (const d of eachIsoDate('2026-04-03', '2026-04-06')) days.set(d, 'positron')
    const changed = applyHolidayBlocks(days, 'electron')
    expect(changed).toEqual(['2026-04-03', '2026-04-04', '2026-04-05', '2026-04-06'])
  })

  it("Phase 2 — regroupe les vacances d'été (> 2 semaines) en 2 grands blocs sans modifier le total de jours de la Phase 1", () => {
    const sPhase1 = generateSchedule({
      startDate: '2026-06-01',
      endDate: '2026-08-31',
      pattern: 'weekly',
      firstHousehold: 'electron',
      protonIds: P,
      applyHolidayBlocks: false,
      applyHolidayBridges: false,
    })
    const summerDates = eachIsoDate('2026-06-27', '2026-08-16')
    const phase1ElectronCount = summerDates.filter((d) => sPhase1[d]?.p1 === 'electron').length

    const days = new Map<string, Household>()
    for (const [d, a] of Object.entries(sPhase1)) days.set(d, a.p1 as Household)
    applySummerHolidayBlocks(days)

    const phase2ElectronCount = summerDates.filter((d) => days.get(d) === 'electron').length
    expect(phase2ElectronCount).toBe(phase1ElectronCount)

    // Vérifie qu'il n'y a qu'un seul changement de foyer sur l'ensemble des 51 jours d'été (2 grands blocs)
    let transitions = 0
    for (let i = 1; i < summerDates.length; i += 1) {
      if (days.get(summerDates[i]!) !== days.get(summerDates[i - 1]!)) transitions += 1
    }
    expect(transitions).toBe(1)
  })

  it('Phase 4 — intervertit les 2 semaines de vacances de Pâques si la Phase 1 attribue Pâques au mauvais parent', () => {
    // En démarrant le 2026-03-30 (lundi avant Pâques) avec positron, le dimanche de Pâques 2026-04-05 tombe sur positron
    // alors que 2026 (année paire) doit attribuer Pâques à electron (Parent 1).
    const s = generateSchedule({
      startDate: '2026-03-30',
      endDate: '2026-04-19',
      pattern: 'weekly',
      firstHousehold: 'positron',
      protonIds: P,
      applyHolidayBlocks: true,
      evenYearHolidayHousehold: 'electron',
    })
    // 1re partie (Vendredi saint 03.04 → dimanche 12.04) = electron
    expect(s['2026-04-03']?.p1).toBe('electron')
    expect(s['2026-04-05']?.p1).toBe('electron')
    expect(s['2026-04-06']?.p1).toBe('electron')
    expect(s['2026-04-12']?.p1).toBe('electron')
    // 2e semaine (lundi 13.04 → dimanche 19.04) = positron
    expect(s['2026-04-13']?.p1).toBe('positron')
    expect(s['2026-04-19']?.p1).toBe('positron')
  })
})
