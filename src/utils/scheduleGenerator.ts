import {
  easterSunday,
  federalFastMonday,
  getEasterHolidayBlock,
  getSchoolHolidaysForSchoolYear,
  getVaudPublicHolidays,
  getWinterHolidayBlocks,
} from '@/config/vaudCalendar'
import type { AlternancePattern, GeneratorOptions, Household, IsoDate, ScheduleMap } from '@/types'
import { addIsoDays, eachIsoDate, fromIsoDate, isoWeekday, toIsoDate } from './dates'

export const other = (h: Household): Household => (h === 'electron' ? 'positron' : 'electron')

/** Libellés français des modèles d'alternance. */
export const PATTERN_LABELS: Record<AlternancePattern, { label: string; description: string }> = {
  weekly: { label: 'Semaine A / Semaine B', description: 'Une semaine complète chez chaque parent, en alternance.' },
  'two-two-three': {
    label: '2-2-3',
    description: '2 jours chez l’un, 2 jours chez l’autre, puis 3 jours (week-end) en alternance.',
  },
  'two-two-five-five': {
    label: '2-2-5-5',
    description: 'Lundi-mardi fixes chez l’un, mercredi-jeudi chez l’autre, week-ends prolongés alternés.',
  },
  'alternate-weekends': {
    label: 'Un week-end sur deux',
    description: 'Semaine chez le premier foyer, un week-end sur deux chez le second.',
  },
  custom: { label: 'Personnalisé', description: 'Définissez votre propre cycle jour par jour.' },
}

/**
 * Retourne le cycle (séquence de foyers jour par jour) d'un modèle d'alternance,
 * exprimé avec `A` = foyer qui commence et `B` = l'autre foyer.
 */
export function buildCycle(pattern: AlternancePattern, first: Household, custom?: Household[]): Household[] {
  const A = first
  const B = other(first)
  switch (pattern) {
    case 'weekly':
      return [A, A, A, A, A, A, A, B, B, B, B, B, B, B]
    case 'two-two-three':
      return [A, A, B, B, A, A, A, B, B, A, A, B, B, B]
    case 'two-two-five-five':
      return [A, A, B, B, A, A, A, A, A, B, B, B, B, B]
    case 'alternate-weekends':
      return [A, A, A, A, A, B, B, A, A, A, A, A, A, A]
    case 'custom':
      if (!custom || custom.length === 0) throw new Error('Le cycle personnalisé est vide.')
      return custom
  }
}

/**
 * Applique la règle des « ponts » fériés vaudois sur un planning d'un enfant.
 *
 * Un bloc contigu de jours fériés (en semaine) qui **précède immédiatement** un week-end (se termine un
 * vendredi) est attribué au parent qui a la garde le samedi ; un bloc qui **succède immédiatement** à un
 * week-end (commence un lundi) est attribué au parent qui a la garde le dimanche. Si un bloc touche
 * les deux (cas théorique), le week-end précédent l'emporte.
 *
 * @param days Planning (date → foyer) d'un enfant, modifié en place.
 * @returns Les dates réattribuées.
 */
export function applyHolidayBridges(days: Map<IsoDate, Household>): IsoDate[] {
  if (days.size === 0) return []
  const dates = [...days.keys()].sort()
  const first = dates[0] as IsoDate
  const last = dates[dates.length - 1] as IsoDate
  const holidaySet = new Set<IsoDate>()
  for (let y = fromIsoDate(first).getFullYear(); y <= fromIsoDate(last).getFullYear(); y += 1) {
    for (const h of getVaudPublicHolidays(y)) if (isoWeekday(h.date) <= 5) holidaySet.add(h.date)
  }

  const changed: IsoDate[] = []
  const visited = new Set<IsoDate>()
  for (const h of [...holidaySet].sort()) {
    if (visited.has(h) || !days.has(h)) continue
    // Construit le bloc contigu de jours fériés en semaine.
    let blockStart = h
    while (holidaySet.has(addIsoDays(blockStart, -1)) && isoWeekday(addIsoDays(blockStart, -1)) <= 5) {
      blockStart = addIsoDays(blockStart, -1)
    }
    let blockEnd = h
    while (holidaySet.has(addIsoDays(blockEnd, 1)) && isoWeekday(addIsoDays(blockEnd, 1)) <= 5) {
      blockEnd = addIsoDays(blockEnd, 1)
    }
    const block = eachIsoDate(blockStart, blockEnd)
    block.forEach((d) => visited.add(d))

    let owner: Household | undefined
    if (isoWeekday(blockStart) === 1) owner = days.get(addIsoDays(blockStart, -1)) // dimanche précédent
    if (isoWeekday(blockEnd) === 5) owner = days.get(addIsoDays(blockEnd, 1)) ?? owner // samedi suivant
    if (!owner) continue
    for (const d of block) {
      if (days.has(d) && days.get(d) !== owner) {
        days.set(d, owner)
        changed.push(d)
      }
    }
  }
  return changed
}

/**
 * Phase 2 — Répartition des vacances scolaires supérieures à 2 semaines (vacances d'été).
 *
 * - Vacances de 1 jour à 1 semaine (Ascension, Relâches) : non modifiées (répartition de la Phase 1).
 * - Vacances de 1 à 2 semaines (Automne) : non modifiées (l'alternance une semaine sur deux équilibre naturellement).
 * - Vacances supérieures à 2 semaines (Été, ~7 semaines) : sans modifier le nombre total de jours
 *   de chaque parent issu de la Phase 1 sur l'été, regroupe les semaines en 2 grands blocs contigus
 *   pour éviter les déplacements et passages de relais intempestifs hors période scolaire.
 */
export function applySummerHolidayBlocks(days: Map<IsoDate, Household>): IsoDate[] {
  if (days.size === 0) return []
  const dates = [...days.keys()].sort()
  const first = dates[0] as IsoDate
  const last = dates[dates.length - 1] as IsoDate
  const startYear = fromIsoDate(first).getFullYear()
  const endYear = fromIsoDate(last).getFullYear()

  const changed = new Set<IsoDate>()
  for (let y = startYear - 1; y <= endYear; y += 1) {
    const periods = getSchoolHolidaysForSchoolYear(y)
    for (const p of periods) {
      const periodDates = eachIsoDate(p.start, p.end)
      // Seules les périodes > 2 semaines (vacances d'été, > 17 jours) sont regroupées en blocs.
      if (p.kind !== 'ete' && periodDates.length <= 17) continue
      const available = periodDates.filter((d) => days.has(d))
      if (available.length <= 17) continue

      // Le premier bloc prolonge le parent en charge au début des vacances d'été (fin de la dernière semaine d'école).
      const firstBlockParent = days.get(available[0] as IsoDate)
      if (!firstBlockParent) continue
      const secondBlockParent = other(firstBlockParent)
      const firstParentTotalDays = available.filter((d) => days.get(d) === firstBlockParent).length

      available.forEach((d, idx) => {
        const target = idx < firstParentTotalDays ? firstBlockParent : secondBlockParent
        if (days.get(d) !== target) {
          days.set(d, target)
          changed.add(d)
        }
      })
    }
  }
  return [...changed].sort()
}

/**
 * Phase 3 — Règles spécifiques des jours fériés vaudois :
 * - Jeudi de l'Ascension + pont du vendredi : attribués au parent en charge cette semaine-là.
 * - Lundi de Pentecôte : attribué au parent qui était en charge le week-end directement précédent.
 * - 1er août (Fête nationale) : attribué au parent en charge cette semaine-là.
 * - Lundi du Jeûne fédéral : attribué au parent qui était en charge le week-end directement précédent.
 */
export function applyPublicHolidayRules(days: Map<IsoDate, Household>): IsoDate[] {
  if (days.size === 0) return []
  const dates = [...days.keys()].sort()
  const first = dates[0] as IsoDate
  const last = dates[dates.length - 1] as IsoDate
  const startYear = fromIsoDate(first).getFullYear()
  const endYear = fromIsoDate(last).getFullYear()

  const changed = new Set<IsoDate>()
  const setDay = (date: IsoDate, owner: Household | undefined) => {
    if (!owner || !days.has(date)) return
    if (days.get(date) !== owner) {
      days.set(date, owner)
      changed.add(date)
    }
  }

  for (let y = startYear; y <= endYear; y += 1) {
    const easterIso = toIsoDate(easterSunday(y))

    // 1. Jeudi de l'Ascension + pont du vendredi : parent en charge cette semaine-là (lundi de la semaine).
    const ascensionThursday = addIsoDays(easterIso, 39)
    const ascensionFriday = addIsoDays(easterIso, 40)
    const ascensionWeekMonday = addIsoDays(ascensionThursday, -3)
    const ascensionOwner = days.get(ascensionWeekMonday) ?? days.get(ascensionThursday)
    setDay(ascensionThursday, ascensionOwner)
    setDay(ascensionFriday, ascensionOwner)

    // 2. Lundi de Pentecôte : parent en charge le week-end directement précédent (dimanche).
    const pentecostMonday = addIsoDays(easterIso, 50)
    const pentecostWeekendOwner = days.get(addIsoDays(pentecostMonday, -1))
    setDay(pentecostMonday, pentecostWeekendOwner)

    // 3. 1er août : parent en charge cette semaine-là.
    const august1 = `${y}-08-01`
    const august1Weekday = isoWeekday(august1)
    const august1WeekMonday = addIsoDays(august1, -(august1Weekday - 1))
    const august1Owner = days.get(august1WeekMonday) ?? days.get(august1)
    setDay(august1, august1Owner)

    // 4. Lundi du Jeûne fédéral : parent en charge le week-end directement précédent (dimanche).
    const jeuneFederalMonday = toIsoDate(federalFastMonday(y))
    const jeuneFederalWeekendOwner = days.get(addIsoDays(jeuneFederalMonday, -1))
    setDay(jeuneFederalMonday, jeuneFederalWeekendOwner)
  }

  // Applique également la règle générale des ponts fériés adjacents à un week-end.
  for (const d of applyHolidayBridges(days)) changed.add(d)

  return [...changed].sort()
}

/**
 * Détermine quel foyer accueille les enfants sur chacun des blocs de fêtes (Noël, Nouvel An, Pâques)
 * pour une année donnée :
 * - Années paires : Bloc 1 (Noël : 24 et 25.12) et Pâques → Parent 1 (`evenYearHousehold`),
 *   Bloc 2 (Nouvel An : 31.12 et 01.01) → Parent 2.
 * - Années impaires : inversion automatique (Bloc 1 Noël et Pâques → Parent 2, Bloc 2 Nouvel An → Parent 1).
 */
export function getHolidayBlockHouseholds(
  year: number,
  evenYearHousehold: Household = 'electron',
): { christmas: Household; newYear: Household; easter: Household } {
  const parent1 = evenYearHousehold
  const parent2 = other(evenYearHousehold)
  const isEvenYear = year % 2 === 0
  return {
    christmas: isEvenYear ? parent1 : parent2,
    newYear: isEvenYear ? parent2 : parent1,
    easter: isEvenYear ? parent1 : parent2,
  }
}

/**
 * Phase 4 — Fêtes majeures (Pâques, Noël & Nouvel An) :
 * - Fériés et week-end de Pâques :
 *   - Si l'alternance de la Phase 1 attribue déjà le week-end de Pâques au bon parent (Parent 1 les années paires,
 *     Parent 2 les années impaires), on conserve les semaines telles quelles (en rattachant le Vendredi saint et
 *     le Lundi de Pâques au week-end de Pâques).
 *   - Sinon, on intervertit les deux semaines des vacances scolaires de Pâques afin que le parent attendu ait
 *     le week-end et les fériés de Pâques + la 1re semaine, et l'autre parent la 2e semaine.
 * - Noël & Nouvel An :
 *   - Découpe les vacances scolaires d'hiver en 2 blocs égaux :
 *     Bloc 1 (incluant 24 et 25.12) au Parent 1 les années paires (Parent 2 les années impaires) ;
 *     Bloc 2 (incluant 31.12 et 01.01) au Parent 2 les années paires (Parent 1 les années impaires).
 */
export function applyHolidayBlocks(days: Map<IsoDate, Household>, evenYearHousehold: Household = 'electron'): IsoDate[] {
  if (days.size === 0) return []
  const dates = [...days.keys()].sort()
  const first = dates[0] as IsoDate
  const last = dates[dates.length - 1] as IsoDate
  const startYear = fromIsoDate(first).getFullYear()
  const endYear = fromIsoDate(last).getFullYear()

  const changed = new Set<IsoDate>()
  const assignBlock = (blockDates: IsoDate[], owner: Household) => {
    for (const d of blockDates) {
      if (days.has(d) && days.get(d) !== owner) {
        days.set(d, owner)
        changed.add(d)
      }
    }
  }

  for (let y = startYear - 1; y <= endYear; y += 1) {
    const owners = getHolidayBlockHouseholds(y, evenYearHousehold)
    const easterBlock = getEasterHolidayBlock(y)
    const currentEasterOwner = days.get(easterBlock.easterDate)

    if (currentEasterOwner && currentEasterOwner !== owners.easter) {
      // Intervertit les semaines des vacances scolaires de Pâques si l'alternance de base ne correspond pas.
      const paquesPeriod = getSchoolHolidaysForSchoolYear(y - 1).find((p) => p.kind === 'paques')
      if (paquesPeriod) {
        const firstWeekEnd = addIsoDays(easterBlock.easterDate, 7)
        const week1Dates = eachIsoDate(paquesPeriod.start, firstWeekEnd <= paquesPeriod.end ? firstWeekEnd : paquesPeriod.end)
        const week2Start = addIsoDays(firstWeekEnd, 1)
        const week2Dates = week2Start <= paquesPeriod.end ? eachIsoDate(week2Start, paquesPeriod.end) : []
        assignBlock(week1Dates, owners.easter)
        assignBlock(week2Dates, other(owners.easter))
      }
    }
    // Garantit dans tous les cas que le bloc Vendredi saint → Lundi de Pâques appartient au parent désigné.
    assignBlock(easterBlock.dates, owners.easter)

    // Noël (Bloc 1 : 24-25.12) & Nouvel An (Bloc 2 : 31.12-01.01) en 2 blocs égaux sur les vacances d'hiver.
    const winterBlocks = getWinterHolidayBlocks(y)
    assignBlock(winterBlocks.christmasBlock.dates, owners.christmas)
    assignBlock(winterBlocks.newYearBlock.dates, owners.newYear)
  }

  return [...changed].sort()
}

/**
 * Génère automatiquement un planning d'alternance en 4 phases :
 * - Phase 1 : Répartition de base (alternance à partir de `startDate` avec `firstHousehold`).
 * - Phase 2 : Répartition des vacances scolaires (regroupement des vacances d'été > 2 semaines en 2 grands blocs sans modifier le total de jours de la Phase 1).
 * - Phase 3 : Jours fériés (Ascension + pont, Lundi de Pentecôte, 1er août, Lundi du Jeûne fédéral et ponts fériés).
 * - Phase 4 : Fêtes majeures (Pâques avec interversion des semaines si nécessaire, et Noël / Nouvel An en 2 blocs égaux années paires / impaires).
 *
 * @returns Planning `date → (protonId → foyer)`.
 */
export function generateSchedule(options: GeneratorOptions): ScheduleMap {
  const { startDate, endDate, pattern, firstHousehold, customCycle, protonIds } = options
  if (endDate < startDate) throw new Error('La date de fin doit être postérieure à la date de début.')
  if (protonIds.length === 0) throw new Error('Sélectionnez au moins un enfant.')

  const cycle = buildCycle(pattern, firstHousehold, customCycle)
  const at = (offset: number): Household => cycle[((offset % cycle.length) + cycle.length) % cycle.length] as Household

  // Fenêtre étendue de 60 jours de chaque côté pour que les périodes de vacances en bord de plage soient complètes.
  const CONTEXT_PADDING_DAYS = 60
  const extendedStart = addIsoDays(startDate, -CONTEXT_PADDING_DAYS)
  const extendedEnd = addIsoDays(endDate, CONTEXT_PADDING_DAYS)
  const perChild = new Map<IsoDate, Household>()

  // Phase 1 — Répartition de base
  eachIsoDate(extendedStart, extendedEnd).forEach((d, i) => perChild.set(d, at(i - CONTEXT_PADDING_DAYS)))

  // Phase 2 — Répartition des vacances scolaires (> 2 semaines : vacances d'été en grands blocs)
  if (options.applyHolidayBlocks) {
    applySummerHolidayBlocks(perChild)
  }

  // Phase 3 — Jours fériés (Ascension + pont, Lundi de Pentecôte, 1er août, Lundi du Jeûne fédéral)
  if (options.applyHolidayBridges !== false) {
    applyPublicHolidayRules(perChild)
  }

  // Phase 4 — Fêtes majeures (Pâques, Noël & Nouvel An)
  if (options.applyHolidayBlocks) {
    applyHolidayBlocks(perChild, options.evenYearHolidayHousehold ?? 'electron')
  }

  const result: ScheduleMap = {}
  for (const d of eachIsoDate(startDate, endDate)) {
    const household = perChild.get(d) as Household
    const assignments: Record<string, Household> = {}
    for (const id of protonIds) assignments[id] = household
    result[d] = assignments
  }
  return result
}

/** Parse un cycle personnalisé saisi sous forme de texte « E,E,P,P » (E = Électron, P = Positron). */
export function parseCustomCycle(input: string): Household[] {
  const tokens = input
    .toUpperCase()
    .split(/[\s,;-]+/)
    .filter(Boolean)
  return tokens.map((t) => {
    if (t === 'E') return 'electron'
    if (t === 'P') return 'positron'
    throw new Error(`Symbole inconnu « ${t} » : utilisez E (Électron) ou P (Positron).`)
  })
}
