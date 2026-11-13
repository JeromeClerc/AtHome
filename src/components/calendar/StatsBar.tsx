import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { Card } from '@/components/ui'
import { HOUSEHOLD_STYLES } from '@/config/theme'
import { useAtome } from '@/hooks/useAtome'
import { useStats } from '@/hooks/useStats'
import { cn } from '@/utils/cn'
import { percent, type SplitCount } from '@/utils/stats'

function SplitStat({ label, count }: { label: string; count: SplitCount }) {
  const pe = percent(count.electron, count.total)
  const pp = count.total ? 100 - pe : 0
  return (
    <div className="min-w-0 flex-1">
      <div className="flex items-baseline justify-between gap-2 text-xs text-slate-500">
        <span className="truncate font-medium">{label}</span>
        <span>{count.total} j</span>
      </div>
      <div className="mt-1 flex h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800" aria-hidden>
        <span className={HOUSEHOLD_STYLES.electron.dot} style={{ width: `${pe}%` }} />
        <span className={HOUSEHOLD_STYLES.positron.dot} style={{ width: `${pp}%` }} />
      </div>
      <div className="mt-1 flex justify-between text-xs">
        <span className={HOUSEHOLD_STYLES.electron.text}>
          {count.electron} j · {pe}%
        </span>
        <span className={HOUSEHOLD_STYLES.positron.text}>
          {count.positron} j · {pp}%
        </span>
      </div>
    </div>
  )
}

/** Bandeau compact des statistiques de répartition (année civile, filtrable par enfant). */
export function StatsBar({ initialYear }: { initialYear: number }) {
  const { protons, atome } = useAtome()
  const [year, setYear] = useState(initialYear)
  const [protonId, setProtonId] = useState<string | null>(null)
  const { stats, loading } = useStats(`${year}-01-01`, `${year}-12-31`, protonId)

  return (
    <Card className="p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => setYear((y) => y - 1)} className="rounded p-1 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Année précédente">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <h2 className="text-sm font-semibold">Répartition {year}</h2>
          <button type="button" onClick={() => setYear((y) => y + 1)} className="rounded p-1 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Année suivante">
            <ChevronRight className="h-4 w-4" />
          </button>
          {loading && <span className="text-xs text-slate-400">…</span>}
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <span className={cn('inline-flex items-center gap-1', HOUSEHOLD_STYLES.electron.text)}>
            <span className={cn('h-2 w-2 rounded-full', HOUSEHOLD_STYLES.electron.dot)} /> {atome.households.electron.label}
          </span>
          <span className={cn('inline-flex items-center gap-1', HOUSEHOLD_STYLES.positron.text)}>
            <span className={cn('h-2 w-2 rounded-full', HOUSEHOLD_STYLES.positron.dot)} /> {atome.households.positron.label}
          </span>
          {protons.length > 1 && (
            <select
              aria-label="Filtrer par enfant"
              value={protonId ?? ''}
              onChange={(e) => setProtonId(e.target.value || null)}
              className="rounded-md border border-slate-300 bg-transparent px-2 py-1 dark:border-slate-700"
            >
              <option value="">Tous les enfants</option>
              {protons.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.firstName}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>
      <div className="flex flex-col gap-4 sm:flex-row sm:gap-6">
        <SplitStat label={protonId || protons.length <= 1 ? 'Jours totaux' : 'Jours-enfants totaux'} count={stats.all} />
        <SplitStat label="Vacances scolaires" count={stats.schoolHolidays} />
        <SplitStat label="Jours fériés" count={stats.publicHolidays} />
        <SplitStat label="Week-ends" count={stats.weekends} />
      </div>
    </Card>
  )
}
