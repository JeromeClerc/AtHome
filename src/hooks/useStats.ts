import { useMemo } from 'react'
import type { IsoDate } from '@/types'
import { computeMajorHolidays, computeStats, type CustodyStats, type MajorHolidayMilestone } from '@/utils/stats'
import { useAtome } from './useAtome'
import { useCustodyDays } from './useSchedule'

/**
 * Statistiques temps réel de répartition sur une période (par défaut l'année civile),
 * accompagnées des 3 jalons « Fêtes majeures » (Pâques, Noël, Nouvel An).
 * @param protonId Enfant filtré ; null = tous les enfants (jours-enfants).
 */
export function useStats(
  start: IsoDate,
  end: IsoDate,
  protonId: string | null,
): { stats: CustodyStats; majorHolidays: MajorHolidayMilestone[]; loading: boolean } {
  const { atome } = useAtome()
  const { schedule, loading } = useCustodyDays(atome.id, start, end)
  const year = Number(start.slice(0, 4))
  const stats = useMemo(() => computeStats(schedule, start, end, protonId), [schedule, start, end, protonId])
  const majorHolidays = useMemo(() => computeMajorHolidays(schedule, year, protonId), [schedule, year, protonId])
  return { stats, majorHolidays, loading }
}
