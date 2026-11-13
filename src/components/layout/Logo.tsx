import { cn } from '@/utils/cn'

/**
 * Logo « At Home » : trois orbitales d'atome entourant une maison stylisée
 * qui abrite deux silhouettes d'enfants. Les couleurs reprennent celles des foyers
 * (Électron = bleu, Positron = ambre).
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={cn('h-9 w-9', className)} role="img" aria-label="Logo At Home">
      <g fill="none" strokeWidth="2.2" strokeLinecap="round">
        <ellipse cx="32" cy="32" rx="29" ry="11" className="stroke-sky-500" />
        <ellipse cx="32" cy="32" rx="29" ry="11" transform="rotate(60 32 32)" className="stroke-amber-500" />
        <ellipse cx="32" cy="32" rx="29" ry="11" transform="rotate(-60 32 32)" className="stroke-violet-500" />
      </g>
      {/* Électrons en orbite */}
      <circle cx="61" cy="32" r="2.6" className="fill-sky-500" />
      <circle cx="17.5" cy="57.1" r="2.6" className="fill-violet-500" />
      <circle cx="17.5" cy="6.9" r="2.6" className="fill-amber-500" />
      {/* Maison (noyau) */}
      <path
        d="M19 31.5 32 20l13 11.5V45a2 2 0 0 1-2 2H21a2 2 0 0 1-2-2Z"
        className="fill-white stroke-slate-800 dark:fill-slate-900 dark:stroke-slate-100"
        strokeWidth="2.4"
        strokeLinejoin="round"
      />
      {/* Deux enfants */}
      <g className="fill-slate-800 dark:fill-slate-100">
        <circle cx="27.5" cy="33" r="2.6" />
        <path d="M23.8 44.5v-4.2a3.7 3.7 0 0 1 7.4 0v4.2Z" />
        <circle cx="36.8" cy="35" r="2.1" />
        <path d="M33.8 44.5v-3.2a3 3 0 0 1 6 0v3.2Z" />
      </g>
    </svg>
  )
}

export function Logo({ className, showText = true }: { className?: string; showText?: boolean }) {
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <LogoMark />
      {showText && (
        <span className="text-lg font-bold tracking-tight">
          At <span className="text-brand-600 dark:text-brand-500">Home</span>
        </span>
      )}
    </span>
  )
}
