import type { ReactNode } from 'react'
import { Clock, Flag } from 'lucide-react'
import { NOTE_AUTHOR_COLORS } from '@/config/theme'
import type { AtomeRole } from '@/types'
import { cn } from '@/utils/cn'

function Swatch({ className, children }: { className?: string; children?: ReactNode }) {
  return (
    <span className={cn('relative inline-flex h-4 w-6 shrink-0 items-center justify-center overflow-hidden rounded border border-slate-300 dark:border-slate-700', className)}>
      {children}
    </span>
  )
}

/** Légende visuelle du planning. */
export function Legend({ className }: { className?: string }) {
  const items: Array<{ swatch: ReactNode; label: string }> = [
    { swatch: <Swatch className="bg-white dark:bg-slate-900" />, label: 'Semaine (lun-ven)' },
    { swatch: <Swatch className="bg-slate-200 dark:bg-slate-800" />, label: 'Week-end (teinte soutenue)' },
    { swatch: <Swatch className="bg-sky-100 dark:bg-sky-900/50" />, label: 'Garde Électron' },
    { swatch: <Swatch className="bg-sky-200 dark:bg-sky-800/70" />, label: 'Électron (week-end)' },
    { swatch: <Swatch className="bg-amber-100 dark:bg-amber-900/40" />, label: 'Garde Positron' },
    { swatch: <Swatch className="bg-amber-200 dark:bg-amber-800/60" />, label: 'Positron (week-end)' },
    {
      swatch: (
        <Swatch>
          <Flag className="h-3 w-3 text-rose-600" />
        </Swatch>
      ),
      label: 'Jour férié (Vaud)',
    },
    {
      swatch: (
        <Swatch>
          <span className="absolute inset-x-0 bottom-0 h-1 bg-violet-500" />
        </Swatch>
      ),
      label: 'Vacances scolaires (Vaud)',
    },
    {
      swatch: (
        <Swatch className="stripes-pending outline-2 -outline-offset-2 outline-dashed outline-slate-600">
          <Clock className="h-3 w-3" />
        </Swatch>
      ),
      label: 'En attente de validation',
    },
  ]
  return (
    <div className={cn('flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-600 dark:text-slate-400', className)}>
      {items.map((it) => (
        <span key={it.label} className="inline-flex items-center gap-1.5">
          {it.swatch}
          {it.label}
        </span>
      ))}
      <span className="inline-flex items-center gap-1.5">
        Notes :
        {(Object.keys(NOTE_AUTHOR_COLORS) as AtomeRole[]).map((r) => (
          <span key={r} className="inline-flex items-center gap-1">
            <span className={cn('h-2 w-2 rounded-full', NOTE_AUTHOR_COLORS[r].dot)} />
            {NOTE_AUTHOR_COLORS[r].label}
          </span>
        ))}
      </span>
    </div>
  )
}
