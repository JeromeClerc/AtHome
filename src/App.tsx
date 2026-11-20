import { Atom, Plus } from 'lucide-react'
import { lazy, Suspense, type ReactNode } from 'react'
import { BrowserRouter, Link, Navigate, Outlet, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom'
import { CenteredLayout, MainLayout } from '@/components/layout/MainLayout'
import { Logo } from '@/components/layout/Logo'
import { Alert, Button, Card, FullPageSpinner } from '@/components/ui'
import { isFirebaseConfigured } from '@/config/firebase'
import { ROLE_LABELS } from '@/config/theme'
import { AtomeProvider } from '@/context/AtomeContext'
import { AuthProvider } from '@/context/AuthContext'
import { ThemeProvider } from '@/context/ThemeContext'
import { useMyAtomes } from '@/hooks/useAtome'
import { useAuth } from '@/hooks/useAuth'
import { logout } from '@/services/auth.service'

// Pages chargées à la demande (découpage du bundle).
const AuthPage = lazy(() => import('@/pages/AuthPage').then((m) => ({ default: m.AuthPage })))
const InviteAcceptPage = lazy(() => import('@/pages/InviteAcceptPage').then((m) => ({ default: m.InviteAcceptPage })))
const SetupAtomePage = lazy(() => import('@/pages/SetupAtomePage').then((m) => ({ default: m.SetupAtomePage })))
const FoyerPage = lazy(() => import('@/pages/SetupAtomePage').then((m) => ({ default: m.FoyerPage })))
const DashboardPage = lazy(() => import('@/pages/DashboardPage').then((m) => ({ default: m.DashboardPage })))
const ProtonsPage = lazy(() => import('@/pages/ProtonsPage').then((m) => ({ default: m.ProtonsPage })))
const ProfilePage = lazy(() => import('@/pages/ProfilePage').then((m) => ({ default: m.ProfilePage })))
const HelpPage = lazy(() => import('@/pages/HelpPage').then((m) => ({ default: m.HelpPage })))
const CompleteProfileForm = lazy(() => import('@/pages/AuthPage').then((m) => ({ default: m.CompleteProfileForm })))

/**
 * Route protégée : redirige vers /auth si l'utilisateur n'est pas connecté, et demande de compléter
 * le profil (prénom, nom) d'un compte créé par lien e-mail qui n'en a pas encore.
 */
function RequireAuth({ children }: { children: ReactNode }) {
  const { user, profile, loading } = useAuth()
  const location = useLocation()
  if (loading) return <FullPageSpinner />
  if (!user) return <Navigate to="/auth" replace state={{ from: `${location.pathname}${location.search}` }} />
  if (!profile) {
    return (
      <CenteredLayout>
        <Card className="w-full max-w-md p-6">
          <h1 className="mb-3 text-lg font-semibold">Complétez votre compte</h1>
          <CompleteProfileForm requirePassword={false} />
        </Card>
      </CenteredLayout>
    )
  }
  return <>{children}</>
}

/** Accueil : redirige vers l'unique Atome, propose un choix s'il y en a plusieurs, ou la création sinon. */
function HomeRedirect() {
  const { atomes, loading } = useMyAtomes()
  const { user } = useAuth()
  if (loading) return <FullPageSpinner />
  if (atomes.length === 0) return <Navigate to="/setup" replace />
  if (atomes.length === 1 && atomes[0]) return <Navigate to={`/${atomes[0].slug}`} replace />
  return (
    <CenteredLayout>
      <div className="w-full max-w-md space-y-4">
        <Logo />
        <Card className="p-5">
          <h1 className="mb-3 text-lg font-semibold">Choisir un Atome</h1>
          <ul className="space-y-2">
            {atomes.map((a) => (
              <li key={a.id}>
                <Link to={`/${a.slug}`} className="flex items-center justify-between rounded-xl border border-slate-200 p-3 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800">
                  <span className="inline-flex items-center gap-2 font-medium">
                    <Atom className="h-4 w-4 text-brand-600" /> {a.name}
                  </span>
                  {user && a.members[user.uid] && <span className="text-xs text-slate-500">{ROLE_LABELS[a.members[user.uid] ?? 'neutron']}</span>}
                </Link>
              </li>
            ))}
          </ul>
          <Link to="/setup" className="mt-4 inline-flex items-center gap-1 text-sm text-brand-600 hover:underline">
            <Plus className="h-4 w-4" /> Créer un nouvel Atome
          </Link>
        </Card>
      </div>
    </CenteredLayout>
  )
}

function AtomeNotFound({ message }: { message?: string }) {
  const navigate = useNavigate()
  return (
    <CenteredLayout>
      <Card className="max-w-md p-6 text-center">
        <h1 className="text-lg font-semibold">Atome introuvable</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          {message ?? "Cet Atome n'existe pas ou vous n'en êtes pas membre."}
        </p>
        <div className="mt-4 flex justify-center gap-2">
          <Button variant="secondary" onClick={() => navigate('/')}>
            Mes Atomes
          </Button>
          <Button variant="ghost" onClick={() => void logout()}>
            Changer de compte
          </Button>
        </div>
      </Card>
    </CenteredLayout>
  )
}

/** Charge l'Atome du slug de l'URL et rend les pages internes dans le gabarit principal. */
function AtomeRoute() {
  const { atomeSlug = '' } = useParams()
  return (
    <AtomeProvider slug={atomeSlug} fallback={<FullPageSpinner />} notFound={(m) => <AtomeNotFound message={m} />}>
      <Outlet />
    </AtomeProvider>
  )
}

function FirebaseNotConfigured() {
  return (
    <CenteredLayout>
      <Card className="max-w-lg space-y-3 p-6">
        <Logo />
        <h1 className="text-lg font-semibold">Configuration Firebase manquante</h1>
        <Alert tone="warning">
          Copiez <code>.env.example</code> en <code>.env.local</code>, renseignez les clés de votre projet Firebase puis relancez{' '}
          <code>npm run dev</code>. Voir <code>docs/FIREBASE_SETUP.md</code>.
        </Alert>
      </Card>
    </CenteredLayout>
  )
}

export default function App() {
  if (!isFirebaseConfigured) {
    return (
      <ThemeProvider>
        <FirebaseNotConfigured />
      </ThemeProvider>
    )
  }
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Suspense fallback={<FullPageSpinner />}>
          <Routes>
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/invite/:token" element={<InviteAcceptPage />} />
            <Route
              path="/setup"
              element={
                <RequireAuth>
                  <SetupAtomePage />
                </RequireAuth>
              }
            />
            <Route
              path="/"
              element={
                <RequireAuth>
                  <HomeRedirect />
                </RequireAuth>
              }
            />
            <Route
              path="/:atomeSlug"
              element={
                <RequireAuth>
                  <AtomeRoute />
                </RequireAuth>
              }
            >
              <Route element={<MainLayout />}>
                <Route index element={<DashboardPage />} />
                <Route path="aide" element={<HelpPage />} />
                <Route path="enfants" element={<ProtonsPage />} />
                <Route path="foyer" element={<FoyerPage />} />
                <Route path="profil" element={<ProfilePage />} />
                <Route path="*" element={<Navigate to=".." replace />} />
              </Route>
            </Route>
          </Routes>
          </Suspense>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  )
}
