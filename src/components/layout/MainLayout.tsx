import type { ReactNode } from 'react'
import { Outlet } from 'react-router-dom'
import { Footer } from './Footer'
import { Header } from './Header'

/** Gabarit des pages d'un Atome : en-tête, contenu, pied de page. */
export function MainLayout() {
  return (
    <div className="flex min-h-dvh flex-col">
      <Header />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}

/** Gabarit simple (authentification, création d'Atome, invitation). */
export function CenteredLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-gradient-to-br from-sky-50 via-white to-amber-50 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900">
      <main className="flex flex-1 items-center justify-center px-4 py-10">{children}</main>
      <Footer />
    </div>
  )
}
