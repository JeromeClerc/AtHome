import { useMemo } from 'react'
import type { IsoDate } from '@/types'
import { computeStats, type CustodyStats } from '@/utils/stats'
import { useAtome } from './useAtome'
import { useCustodyDays } from './useSchedule'

/**
 * Statistiques temps réel de répartition sur une période (par défaut l'année civile).
 * @param protonId Enfant filtré ; null = tous les enfants (jours-enfants).
 */
export function useStats(start: IsoDate, end: IsoDate, protonId: string | null): { stats: CustodyStats; loading: boolean } {
  const { atome } = useAtome()
  const { schedule, loading } = useCustodyDays(atome.id, start, end)
  const stats = useMemo(() => computeStats(schedule, start, end, protonId), [schedule, start, end, protonId])
  return { stats, loading }
}
