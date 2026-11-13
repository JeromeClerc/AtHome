import { AlertTriangle, CheckCircle2, Info, Loader2, XCircle } from 'lucide-react'
import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '@/utils/cn'
import { initials } from '@/utils/strings'

export function Card({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900', className)}
      {...rest}
    />
  )
}

export function CardHeader({ title, description, actions }: { title: ReactNode; description?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 px-5 py-4 dark:border-slate-800">
      <div>
        <h2 className="text-base font-semibold">{title}</h2>
        {description && <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  )
}

export function Badge({ className, ...rest }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300',
        className,
      )}
      {...rest}
    />
  )
}

export function Avatar({ name, className, ring }: { name: string; className?: string; ring?: string }) {
  return (
    <span
      className={cn(
        'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-violet-500 text-sm font-semibold text-white ring-2 ring-offset-2 ring-offset-white dark:ring-offset-slate-900',
        ring ?? 'ring-transparent',
        className,
      )}
      aria-hidden
    >
      {initials(name) || '?'}
    </span>
  )
}

export function Spinner({ label = 'Chargement…', className }: { label?: string; className?: string }) {
  return (
    <div role="status" className={cn('flex items-center justify-center gap-2 p-6 text-sm text-slate-500', className)}>
      <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
      <span>{label}</span>
    </div>
  )
}

export function FullPageSpinner() {
  return (
    <div className="flex min-h-dvh items-center justify-center">
      <Spinner />
    </div>
  )
}

type AlertTone = 'info' | 'success' | 'warning' | 'error'
const ALERT: Record<AlertTone, { cls: string; Icon: typeof Info }> = {
  info: { cls: 'border-sky-200 bg-sky-50 text-sky-900 dark:border-sky-900 dark:bg-sky-950/50 dark:text-sky-100', Icon: Info },
  success: {
    cls: 'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-100',
    Icon: CheckCircle2,
  },
  warning: {
    cls: 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-100',
    Icon: AlertTriangle,
  },
  error: { cls: 'border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-100', Icon: XCircle },
}

export function Alert({ tone = 'info', children, className }: { tone?: AlertTone; children: ReactNode; className?: string }) {
  const { cls, Icon } = ALERT[tone]
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} className={cn('flex gap-2 rounded-xl border px-3 py-2.5 text-sm', cls, className)}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  )
}

export function EmptyState({ icon, title, children }: { icon: ReactNode; title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
      <div className="rounded-full bg-slate-100 p-3 text-slate-500 dark:bg-slate-800">{icon}</div>
      <p className="font-medium">{title}</p>
      {children && <div className="max-w-sm text-sm text-slate-500 dark:text-slate-400">{children}</div>}
    </div>
  )
}
