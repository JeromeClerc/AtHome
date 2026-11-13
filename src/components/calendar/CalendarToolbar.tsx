import { CalendarCheck, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'
import { Button } from '@/components/ui'
import type { NavigationStep } from '@/types'
import { periodLabel, type CalendarViewMode } from '@/utils/calendarNavigation'
import { cn } from '@/utils/cn'

const VIEWS: Array<{ value: CalendarViewMode; label: string }> = [
  { value: 'day', label: 'Jour' },
  { value: 'week', label: 'Semaine' },
  { value: 'month', label: 'Mois' },
  { value: 'year', label: 'Année' },
]

const STEPS: Array<{ value: NavigationStep; label: string }> = [
  { value: 'day', label: 'Jour' },
  { value: 'week', label: 'Sem.' },
  { value: 'month', label: 'Mois' },
  { value: 'year', label: 'An' },
]

interface Props {
  view: CalendarViewMode
  anchor: string
  onViewChange: (v: CalendarViewMode) => void
  onShift: (step: NavigationStep, dir: 1 | -1) => void
  onToday: () => void
}

/** Barre de navigation : période affichée, vues, déplacements jour/semaine/mois/année, « Aujourd'hui ». */
export function CalendarToolbar({ view, anchor, onViewChange, onShift, onToday }: Props) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold capitalize sm:text-xl" aria-live="polite">
          {periodLabel(view, anchor)}
        </h2>
        <div role="tablist" aria-label="Vue du planning" className="inline-flex rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
          {VIEWS.map((v) => (
            <button
              key={v.value}
              role="tab"
              type="button"
              aria-selected={view === v.value}
              onClick={() => onViewChange(v.value)}
              className={cn(
                'rounded-md px-3 py-1.5 text-sm font-medium transition',
                view === v.value
                  ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-950 dark:text-white'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white',
              )}
            >
              {v.label}
            </button>
          ))}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="secondary" size="sm" icon={<CalendarCheck className="h-4 w-4" />} onClick={onToday}>
          Aujourd'hui
        </Button>
        <div className="flex flex-wrap items-center gap-1">
          {STEPS.map((s) => (
            <div key={s.value} className="inline-flex items-center rounded-lg border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => onShift(s.value, -1)}
                className="rounded-l-lg p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800"
                aria-label={`${s.label} précédent(e)`}
              >
                {s.value === 'year' ? <ChevronsLeft className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
              </button>
              <span className="px-1 text-xs text-slate-500">{s.label}</span>
              <button
                type="button"
                onClick={() => onShift(s.value, 1)}
                className="rounded-r-lg p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800"
                aria-label={`${s.label} suivant(e)`}
              >
                {s.value === 'year' ? <ChevronsRight className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
