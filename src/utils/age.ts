import { addYears, differenceInYears } from 'date-fns'
import type { IsoDate } from '@/types'
import { fromIsoDate } from './dates'

export const MAJORITY_AGE = 18

/** Âge en années révolues à la date de référence. */
export function computeAge(birthDate: IsoDate, at: Date = new Date()): number {
  return differenceInYears(at, fromIsoDate(birthDate))
}

/** Date des 18 ans révolus (minuit local). */
export function majorityDate(birthDate: IsoDate): Date {
  return addYears(fromIsoDate(birthDate), MAJORITY_AGE)
}

/** L'enfant est-il majeur (18 ans révolus) à la date de référence ? */
export function isAdult(birthDate: IsoDate, at: Date = new Date()): boolean {
  return computeAge(birthDate, at) >= MAJORITY_AGE
}

/**
 * Les parents peuvent-ils encore éditer la fiche ? Oui jusqu'à la veille des 18 ans ;
 * ensuite les données appartiennent à l'enfant.
 */
export function canParentsEdit(birthDate: IsoDate, at: Date = new Date()): boolean {
  return !isAdult(birthDate, at)
}
