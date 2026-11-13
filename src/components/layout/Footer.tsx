import { ShieldCheck } from 'lucide-react'
import { APP_VERSION } from '@/config/theme'

export function Footer() {
  return (
    <footer className="border-t border-slate-200 py-5 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 sm:flex-row sm:px-6">
        <p>
          <span className="font-semibold text-slate-700 dark:text-slate-200">At Home</span> · v{APP_VERSION} · Garde alternée
          sereine, Canton de Vaud
        </p>
        <p className="inline-flex items-center gap-1">
          <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
          Données privées, visibles uniquement par les membres de votre Atome.
        </p>
      </div>
    </footer>
  )
}
