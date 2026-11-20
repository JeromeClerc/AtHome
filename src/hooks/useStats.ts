import { useEffect, useMemo, useState } from 'react'
import {
  fetchScheduleRange,
  subscribeGeneratedPeriodRange,
  type GeneratedPeriodRange,
} from '@/services/schedule.service'
import type { IsoDate, ScheduleMap } from '@/types'
import { addIsoDays } from '@/utils/dates'
import {
  computeAverageAnnualStats,
  computeMajorHolidays,
  computeStats,
  type CustodyStats,
  type MajorHolidayMilestone,
} from '@/utils/stats'
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

/**
 * Écoute la plage d'années sur laquelle le planning a été généré (ex. 2026–2040)
 * et calcule, lorsqu'activé, la moyenne annuelle des statistiques sur cette période.
 */
export function useGeneratedPeriodStats(protonId: string | null, enabled: boolean) {
  const { atome } = useAtome()
  const [range, setRange] = useState<GeneratedPeriodRange | null>(null)
  const [periodSchedule, setPeriodSchedule] = useState<ScheduleMap | null>(null)
  const [loadingPeriod, setLoadingPeriod] = useState(false)

  useEffect(() => {
    return subscribeGeneratedPeriodRange(atome.id, setRange, () => setRange(null))
  }, [atome.id])

  useEffect(() => {
    if (!enabled || !range) return undefined
    let active = true
    setLoadingPeriod(true)
    fetchScheduleRange(atome.id, `${range.startYear}-01-01`, `${range.endYear}-12-31`)
      .then((map) => {
        if (active) {
          setPeriodSchedule(map)
          setLoadingPeriod(false)
        }
      })
      .catch(() => {
        if (active) setLoadingPeriod(false)
      })
    return () => {
      active = false
    }
  }, [atome.id, enabled, range])

  const average = useMemo(() => {
    if (!range || !periodSchedule) return null
    return computeAverageAnnualStats(periodSchedule, range.startYear, range.endYear, protonId)
  }, [range, periodSchedule, protonId])

  return { range, average, loadingPeriod }
}
