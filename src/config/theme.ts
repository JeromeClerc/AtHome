import type { AtomeRole, Gender, Household } from '@/types'

/** Libellés et couleurs des foyers (classes Tailwind complètes pour le JIT). */
export const HOUSEHOLD_STYLES: Record<
  Household,
  { label: string; short: string; cell: string; solid: string; text: string; ring: string; dot: string }
> = {
  electron: {
    label: 'Électron',
    short: 'É',
    cell: 'bg-sky-100 text-sky-900 dark:bg-sky-900/50 dark:text-sky-100',
    solid: 'bg-sky-500 text-white',
    text: 'text-sky-700 dark:text-sky-300',
    ring: 'ring-sky-500',
    dot: 'bg-sky-500',
  },
  positron: {
    label: 'Positron',
    short: 'P',
    cell: 'bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100',
    solid: 'bg-amber-500 text-white',
    text: 'text-amber-700 dark:text-amber-300',
    ring: 'ring-amber-500',
    dot: 'bg-amber-500',
  },
}

export const ROLE_LABELS: Record<AtomeRole, string> = {
  electron: 'Électron · Foyer 1',
  positron: 'Positron · Foyer 2',
  proton: 'Proton · Enfant',
  neutron: 'Neutron · Tiers neutre',
}

/** Couleur des notes selon le rôle de l'auteur. */
export const NOTE_AUTHOR_COLORS: Record<AtomeRole, { dot: string; label: string; border: string }> = {
  electron: { dot: 'bg-sky-600', label: 'Électron', border: 'border-sky-500' },
  positron: { dot: 'bg-amber-600', label: 'Positron', border: 'border-amber-500' },
  proton: { dot: 'bg-emerald-500', label: 'Enfant', border: 'border-emerald-500' },
  neutron: { dot: 'bg-fuchsia-500', label: 'Neutron / autre', border: 'border-fuchsia-500' },
}

export const ROLE_BADGE: Record<AtomeRole, string> = {
  electron: 'bg-sky-100 text-sky-800 dark:bg-sky-900/60 dark:text-sky-200',
  positron: 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200',
  proton: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200',
  neutron: 'bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-900/60 dark:text-fuchsia-200',
}

export const GENDER_LABELS: Record<Gender, string> = { female: 'Fille', male: 'Garçon', other: 'Autre' }

/** Palette des enfants (pastilles). */
export const PROTON_COLORS = [
  'bg-emerald-500',
  'bg-violet-500',
  'bg-rose-500',
  'bg-teal-500',
  'bg-orange-500',
  'bg-indigo-500',
] as const

export const protonColor = (index: number): string => PROTON_COLORS[index % PROTON_COLORS.length] ?? 'bg-emerald-500'

export const APP_VERSION = typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : '0.1.0'
