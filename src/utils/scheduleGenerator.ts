import { getVaudPublicHolidays } from '@/config/vaudCalendar'
import type { AlternancePattern, GeneratorOptions, Household, IsoDate, ScheduleMap } from '@/types'
import { addIsoDays, eachIsoDate, fromIsoDate, isoWeekday } from './dates'

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
 * Génère automatiquement un planning d'alternance pour une période et une liste d'enfants.
 *
 * Le cycle démarre au `startDate` avec `firstHousehold`. La règle des ponts fériés est appliquée
 * par défaut. Pour calculer le parent du week-end adjacent à un férié en bord de période, le cycle
 * est étendu d'un jour de chaque côté (sans être retourné).
 *
 * @returns Planning `date → (protonId → foyer)`.
 */
export function generateSchedule(options: GeneratorOptions): ScheduleMap {
  const { startDate, endDate, pattern, firstHousehold, customCycle, protonIds } = options
  if (endDate < startDate) throw new Error('La date de fin doit être postérieure à la date de début.')
  if (protonIds.length === 0) throw new Error('Sélectionnez au moins un enfant.')

  const cycle = buildCycle(pattern, firstHousehold, customCycle)
  const at = (offset: number): Household => cycle[((offset % cycle.length) + cycle.length) % cycle.length] as Household

  const extendedStart = addIsoDays(startDate, -1)
  const extendedEnd = addIsoDays(endDate, 1)
  const perChild = new Map<IsoDate, Household>()
  eachIsoDate(extendedStart, extendedEnd).forEach((d, i) => perChild.set(d, at(i - 1)))
  if (options.applyHolidayBridges !== false) applyHolidayBridges(perChild)

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
