import { Baby, CalendarDays, Home, LogOut, Menu, Moon, Sun, UserRound } from 'lucide-react'
import { Link, NavLink } from 'react-router-dom'
import { Avatar, Badge, Dropdown } from '@/components/ui'
import { ROLE_BADGE, ROLE_LABELS } from '@/config/theme'
import { useAtome } from '@/hooks/useAtome'
import { useAuth } from '@/hooks/useAuth'
import { useTheme } from '@/hooks/useTheme'
import { logout } from '@/services/auth.service'
import { cn } from '@/utils/cn'
import { Logo } from './Logo'
import { NotificationBell } from './NotificationBell'

const NAV = [
  { to: '', label: 'Planning', icon: CalendarDays, end: true },
  { to: 'enfants', label: 'Enfants', icon: Baby, end: false },
  { to: 'foyer', label: 'Foyer & invitations', icon: Home, end: false },
  { to: 'profil', label: 'Mon profil', icon: UserRound, end: false },
] as const

/**
 * En-tête global : logo + nom de l'Atome à gauche ; à droite, dans l'ordre :
 * notifications, avatar (rôle + thème), menu principal.
 */
export function Header() {
  const { atome, role, displayName } = useAtome()
  const { user } = useAuth()
  const { resolved, toggle } = useTheme()
  const base = `/${atome.slug}`

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      'inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
      isActive
        ? 'bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-100'
        : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800',
    )

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/85 backdrop-blur dark:border-slate-800 dark:bg-slate-950/85">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6">
        <Link to={base} className="flex min-w-0 items-center gap-3">
          <Logo />
          <span className="hidden truncate border-l border-slate-200 pl-3 text-sm text-slate-500 sm:inline dark:border-slate-700 dark:text-slate-400">
            {atome.name}
          </span>
        </Link>

        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          <NotificationBell />

          <Dropdown
            className="w-64"
            trigger={({ toggle: t, open }) => (
              <button type="button" onClick={t} aria-expanded={open} aria-label="Mon compte" className="rounded-full p-0.5">
                <Avatar
                  name={displayName}
                  ring={role === 'electron' ? 'ring-sky-500' : role === 'positron' ? 'ring-amber-500' : 'ring-fuchsia-500'}
                />
              </button>
            )}
          >
            {(close) => (
              <div className="p-2">
                <div className="px-2 py-2">
                  <p className="truncate font-medium">{displayName}</p>
                  <p className="truncate text-xs text-slate-500">{user?.email}</p>
                  <Badge className={cn('mt-2', ROLE_BADGE[role])}>{ROLE_LABELS[role]}</Badge>
                </div>
                <hr className="my-1 border-slate-200 dark:border-slate-800" />
                <button
                  type="button"
                  onClick={toggle}
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  {resolved === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                  {resolved === 'dark' ? 'Mode clair' : 'Mode sombre'}
                </button>
                <Link
                  to={`${base}/profil`}
                  onClick={close}
                  className="flex items-center gap-2 rounded-lg px-2 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <UserRound className="h-4 w-4" /> Mon profil
                </Link>
                <Link
                  to="/"
                  onClick={close}
                  className="flex items-center gap-2 rounded-lg px-2 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <Home className="h-4 w-4" /> Changer d'Atome
                </Link>
                <button
                  type="button"
                  onClick={() => void logout()}
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                >
                  <LogOut className="h-4 w-4" /> Se déconnecter
                </button>
              </div>
            )}
          </Dropdown>

          {/* Menu principal : liens en ligne sur grand écran, menu déroulant sur mobile. */}
          <nav aria-label="Navigation principale" className="hidden items-center gap-1 lg:flex">
            {NAV.map(({ to, label, icon: Icon, end }) => (
              <NavLink key={label} to={to ? `${base}/${to}` : base} end={end} className={linkClass}>
                <Icon className="h-4 w-4" aria-hidden />
                {label}
              </NavLink>
            ))}
          </nav>
          <div className="lg:hidden">
            <Dropdown
              className="w-60 p-2"
              trigger={({ toggle: t, open }) => (
                <button
                  type="button"
                  onClick={t}
                  aria-expanded={open}
                  aria-label="Ouvrir le menu"
                  className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  <Menu className="h-5 w-5" />
                </button>
              )}
            >
              {(close) => (
                <nav aria-label="Navigation principale" className="flex flex-col gap-1">
                  {NAV.map(({ to, label, icon: Icon, end }) => (
                    <NavLink key={label} to={to ? `${base}/${to}` : base} end={end} onClick={close} className={linkClass}>
                      <Icon className="h-4 w-4" aria-hidden />
                      {label}
                    </NavLink>
                  ))}
                </nav>
              )}
            </Dropdown>
          </div>
        </div>
      </div>
    </header>
  )
}
