import { useMemo } from 'react'
import type { IsoDate } from '@/types'
import { addIsoDays } from '@/utils/dates'
import { computeMajorHolidays, computeStats, type CustodyStats, type MajorHolidayMilestone } from '@/utils/stats'
import { useAtome } from './useAtome'
import { useCustodyDays } from './useSchedule'

/**
 * Statistiques temps réel de répartition sur une période (par défaut l'année civile),
 * accompagnées des 3 jalons « Fêtes majeures » (Pâques, Noël 24-25.12, Nouvel An 31.12-01.01).
 * @param protonId Enfant filtré ; null = moyenne de tous les enfants de l'Atome sur les 365/366 jours de l'année.
 */
export function useStats(
  start: IsoDate,
  end: IsoDate,
  protonId: string | null,
): { stats: CustodyStats; majorHolidays: MajorHolidayMilestone[]; loading: boolean } {
  const { atome } = useAtome()
  // Étend la souscription d'un jour de chaque côté pour inclure le 01.01 de l'année suivante (Nouvel An 31.12–01.01).
  const { schedule, loading } = useCustodyDays(atome.id, addIsoDays(start, -1), addIsoDays(end, 1))
  const year = Number(start.slice(0, 4))
  const stats = useMemo(() => computeStats(schedule, start, end, protonId), [schedule, start, end, protonId])
  const majorHolidays = useMemo(() => computeMajorHolidays(schedule, year, protonId), [schedule, year, protonId])
  return { stats, majorHolidays, loading }
}
