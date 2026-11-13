import { KeyRound, LogIn, Mail, UserPlus } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Navigate, useLocation, useSearchParams } from 'react-router-dom'
import { CenteredLayout } from '@/components/layout/MainLayout'
import { Logo } from '@/components/layout/Logo'
import { Alert, Button, Card, Input, Spinner } from '@/components/ui'
import { useAuth } from '@/hooks/useAuth'
import {
  completeLinkSignIn,
  createUserProfile,
  isEmailLink,
  login,
  register,
  resetPassword,
  sendLoginLink,
  setPassword,
  storedEmailForLink,
} from '@/services/auth.service'
import { toFrenchError } from '@/services/firestore.helpers'
import { cn } from '@/utils/cn'
import { EMAIL_REGEX } from '@/utils/strings'

type Mode = 'login' | 'register' | 'link' | 'reset'

const MIN_PASSWORD = 8

// ─── Finalisation du compte (prénom, nom, mot de passe) ─────────────────────

/**
 * Formulaire de finalisation d'un compte créé par lien e-mail (invitation ou connexion sans mot de passe) :
 * crée le profil Firestore et, si demandé, définit un mot de passe via Firebase Auth.
 */
export function CompleteProfileForm({ requirePassword, onDone }: { requirePassword: boolean; onDone?: () => void }) {
  const { user, profile } = useAuth()
  const [firstName, setFirstName] = useState(profile?.firstName ?? '')
  const [lastName, setLastName] = useState(profile?.lastName ?? '')
  const [password, setPwd] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const needsProfile = !profile

  if (!user) return null

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    if (needsProfile && (!firstName.trim() || !lastName.trim())) return setError('Prénom et nom sont requis.')
    if (requirePassword) {
      if (password.length < MIN_PASSWORD) return setError(`Le mot de passe doit contenir au moins ${MIN_PASSWORD} caractères.`)
      if (password !== confirm) return setError('Les mots de passe ne correspondent pas.')
    }
    setSaving(true)
    try {
      if (requirePassword) await setPassword(password)
      if (needsProfile) await createUserProfile(user, firstName, lastName)
      onDone?.()
    } catch (err) {
      setError(toFrenchError(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <p className="text-sm text-slate-600 dark:text-slate-400">
        Connecté·e avec <strong>{user.email}</strong> (adresse vérifiée). Complétez votre compte :
      </p>
      {needsProfile && (
        <div className="grid grid-cols-2 gap-3">
          <Input label="Prénom" required autoComplete="given-name" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Camille" />
          <Input label="Nom" required autoComplete="family-name" value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Rochat" />
        </div>
      )}
      {requirePassword && (
        <>
          <Input
            label="Choisissez un mot de passe"
            type="password"
            required
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPwd(e.target.value)}
            hint={`${MIN_PASSWORD} caractères minimum. Vous pourrez aussi toujours vous connecter par lien e-mail.`}
          />
          <Input label="Confirmer le mot de passe" type="password" required autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        </>
      )}
      {error && <Alert tone="error">{error}</Alert>}
      <Button type="submit" className="w-full" loading={saving} icon={<KeyRound className="h-4 w-4" />}>
        Enregistrer et continuer
      </Button>
    </form>
  )
}

// ─── Finalisation d'une connexion par lien ──────────────────────────────────

/** Termine la connexion lorsque l'utilisateur arrive depuis un lien de connexion Firebase. */
function EmailLinkCompletion({ initialEmail }: { initialEmail: string }) {
  const [email, setEmail] = useState(storedEmailForLink() ?? initialEmail)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const autoTried = useRef(false)

  const complete = async (address: string) => {
    setLoading(true)
    setError(null)
    try {
      await completeLinkSignIn(address)
    } catch (err) {
      setError(toFrenchError(err))
    } finally {
      setLoading(false)
    }
  }

  // Même navigateur que celui qui a demandé le lien : connexion automatique.
  useEffect(() => {
    const stored = storedEmailForLink()
    if (stored && !autoTried.current) {
      autoTried.current = true
      void complete(stored)
    }
  }, [])

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold">Connexion par lien</h1>
      {loading && <Spinner label="Connexion en cours…" />}
      {!loading && (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (!EMAIL_REGEX.test(email.trim())) return setError('Adresse e-mail invalide.')
            void complete(email)
          }}
          className="space-y-3"
        >
          <p className="text-sm text-slate-600 dark:text-slate-400">Par sécurité, confirmez l'adresse e-mail à laquelle le lien a été envoyé.</p>
          <Input label="Adresse e-mail" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Button type="submit" className="w-full" icon={<LogIn className="h-4 w-4" />}>
            Se connecter
          </Button>
        </form>
      )}
      {error && <Alert tone="error">{error}</Alert>}
    </div>
  )
}

// ─── Page ───────────────────────────────────────────────────────────────────

/**
 * Connexion / inscription avec Firebase Authentication :
 * - e-mail + mot de passe (avec e-mail de vérification) ;
 * - lien de connexion par e-mail (sans mot de passe) ;
 * - mot de passe oublié.
 * Paramètres d'URL : `?mode=register|link`, `?email=…`, `?next=/chemin`.
 */
export function AuthPage() {
  const { user, profile, loading: authLoading } = useAuth()
  const [params] = useSearchParams()
  const location = useLocation()
  const next = params.get('next') ?? (location.state as { from?: string } | null)?.from ?? '/'
  const initialMode = params.get('mode')
  const [mode, setMode] = useState<Mode>(initialMode === 'register' ? 'register' : initialMode === 'link' ? 'link' : 'login')
  const [email, setEmail] = useState(params.get('email') ?? '')
  const [password, setPwd] = useState('')
  const [confirm, setConfirm] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [linkPending] = useState(() => isEmailLink())

  // Connecté : finalisation du profil si nécessaire (compte créé par lien), sinon redirection.
  if (user && !loading) {
    if (authLoading) return <CenteredLayout><Spinner /></CenteredLayout>
    if (!profile) {
      return (
        <CenteredLayout>
          <Card className="w-full max-w-md p-6">
            <h1 className="mb-3 text-lg font-semibold">Bienvenue sur At Home</h1>
            {/* Connexion sans mot de passe choisie : le mot de passe reste facultatif (définissable dans le profil). */}
            <CompleteProfileForm requirePassword={false} />
          </Card>
        </CenteredLayout>
      )
    }
    return <Navigate to={next} replace />
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setInfo(null)
    if (!EMAIL_REGEX.test(email.trim())) return setError('Adresse e-mail invalide.')
    if (mode === 'register') {
      if (!firstName.trim() || !lastName.trim()) return setError('Prénom et nom sont requis.')
      if (password.length < MIN_PASSWORD) return setError(`Le mot de passe doit contenir au moins ${MIN_PASSWORD} caractères.`)
      if (password !== confirm) return setError('Les mots de passe ne correspondent pas.')
    }
    setLoading(true)
    try {
      if (mode === 'login') await login(email, password)
      else if (mode === 'register') await register({ email, password, firstName, lastName }, next)
      else if (mode === 'link') {
        await sendLoginLink(email, `${window.location.origin}/auth?next=${encodeURIComponent(next)}`)
        setInfo(`Un lien de connexion a été envoyé à ${email.trim()}. Ouvrez-le depuis cet appareil.`)
      } else {
        await resetPassword(email)
        setInfo('Si un compte existe, un e-mail de réinitialisation vient de vous être envoyé.')
      }
    } catch (err) {
      setError(toFrenchError(err))
    } finally {
      setLoading(false)
    }
  }

  const submitLabel = { login: 'Se connecter', register: 'Créer mon compte', link: 'Recevoir le lien', reset: 'Envoyer le lien' }[mode]
  const SubmitIcon = mode === 'register' ? UserPlus : mode === 'link' || mode === 'reset' ? Mail : LogIn

  return (
    <CenteredLayout>
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <Logo className="scale-125" />
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">La garde alternée, sereinement, entre deux foyers.</p>
        </div>
        <Card className="p-6">
          {linkPending ? (
            <EmailLinkCompletion initialEmail={email} />
          ) : (
            <>
              {(mode === 'login' || mode === 'register') && (
                <div role="tablist" className="mb-5 grid grid-cols-2 rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
                  {(['login', 'register'] as const).map((m) => (
                    <button
                      key={m}
                      role="tab"
                      type="button"
                      aria-selected={mode === m}
                      onClick={() => setMode(m)}
                      className={cn('rounded-md py-1.5 text-sm font-medium', mode === m ? 'bg-white shadow-sm dark:bg-slate-950' : 'text-slate-500')}
                    >
                      {m === 'login' ? 'Connexion' : 'Créer un compte'}
                    </button>
                  ))}
                </div>
              )}
              {mode === 'reset' && <h1 className="mb-4 text-lg font-semibold">Mot de passe oublié</h1>}
              {mode === 'link' && (
                <div className="mb-4">
                  <h1 className="text-lg font-semibold">Connexion sans mot de passe</h1>
                  <p className="text-sm text-slate-500">Recevez un lien de connexion à usage unique par e-mail.</p>
                </div>
              )}

              <form onSubmit={submit} className="space-y-4" noValidate>
                {mode === 'register' && (
                  <div className="grid grid-cols-2 gap-3">
                    <Input label="Prénom" required autoComplete="given-name" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Camille" />
                    <Input label="Nom" required autoComplete="family-name" value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Rochat" />
                  </div>
                )}
                <Input
                  label="Adresse e-mail"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="camille.rochat@bluewin.ch"
                />
                {(mode === 'login' || mode === 'register') && (
                  <Input
                    label="Mot de passe"
                    type="password"
                    required
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    value={password}
                    onChange={(e) => setPwd(e.target.value)}
                    hint={mode === 'register' ? `${MIN_PASSWORD} caractères minimum.` : undefined}
                  />
                )}
                {mode === 'register' && (
                  <Input label="Confirmer le mot de passe" type="password" required autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
                )}
                {error && <Alert tone="error">{error}</Alert>}
                {info && <Alert tone="success">{info}</Alert>}
                <Button type="submit" className="w-full" loading={loading} icon={<SubmitIcon className="h-4 w-4" />}>
                  {submitLabel}
                </Button>
              </form>

              <div className="mt-4 flex flex-col items-center gap-2 text-sm">
                {mode === 'login' && (
                  <>
                    <button type="button" className="text-brand-600 hover:underline" onClick={() => setMode('link')}>
                      Recevoir un lien de connexion par e-mail
                    </button>
                    <button type="button" className="text-slate-500 hover:underline" onClick={() => setMode('reset')}>
                      Mot de passe oublié ?
                    </button>
                  </>
                )}
                {(mode === 'reset' || mode === 'link') && (
                  <button type="button" className="text-brand-600 hover:underline" onClick={() => setMode('login')}>
                    Retour à la connexion
                  </button>
                )}
                {mode === 'register' && <p className="text-xs text-slate-500">Un e-mail de confirmation vous sera envoyé pour valider votre adresse.</p>}
              </div>
            </>
          )}
        </Card>
      </div>
    </CenteredLayout>
  )
}
