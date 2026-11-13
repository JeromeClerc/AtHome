import { CheckCircle2, Mail, MailWarning } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { CenteredLayout } from '@/components/layout/MainLayout'
import { Logo } from '@/components/layout/Logo'
import { Alert, Button, Card, Spinner } from '@/components/ui'
import { ROLE_LABELS } from '@/config/theme'
import { useAuth } from '@/hooks/useAuth'
import { completeLinkSignIn, hasPassword, isEmailLink, logout, sendLoginLink } from '@/services/auth.service'
import { toFrenchError } from '@/services/firestore.helpers'
import { acceptInvitation, getInvitation, invitationUrl } from '@/services/invitation.service'
import type { Invitation } from '@/types'
import { CompleteProfileForm } from './AuthPage'

/**
 * Page d'atterrissage d'une invitation : `/invite/:token?a=<atomeId>`.
 *
 * L'e-mail d'invitation est envoyé par **Firebase Authentication** (lien de connexion par e-mail).
 * Parcours :
 * 1. lecture de l'invitation (Atome, rôle, invitant) grâce au jeton ;
 * 2. si l'URL contient le lien Firebase : connexion automatique avec l'adresse invitée
 *    (compte créé au besoin, e-mail de facto vérifié) ;
 * 3. finalisation du compte : prénom, nom et mot de passe ;
 * 4. « Rejoindre l'Atome » : la Cloud Function `acceptInvitation` ajoute le membre avec le bon rôle,
 *    puis redirection (Positron → configuration de son foyer).
 */
export function InviteAcceptPage() {
  const { token = '' } = useParams()
  const [params] = useSearchParams()
  const atomeId = params.get('a') ?? ''
  const { user, profile, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const [invitation, setInvitation] = useState<Invitation | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [info, setInfo] = useState<string | null>(null)
  const [linkPresent, setLinkPresent] = useState(() => isEmailLink())
  const [completed, setCompleted] = useState(false)
  const autoSignInTried = useRef(false)

  useEffect(() => {
    let active = true
    if (!atomeId || !token) {
      setError("Lien d'invitation incomplet.")
      setLoading(false)
      return undefined
    }
    getInvitation(atomeId, token)
      .then((inv) => {
        if (!active) return
        if (!inv) setError('Invitation introuvable.')
        setInvitation(inv)
      })
      .catch((e: unknown) => active && setError(toFrenchError(e)))
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [atomeId, token])

  const expired = invitation?.expiresAt ? invitation.expiresAt.toMillis() < Date.now() : false
  const usable = Boolean(invitation && invitation.status === 'pending' && !expired)
  const emailMismatch = Boolean(user && invitation && user.email?.toLowerCase() !== invitation.email.toLowerCase())

  /** Connexion avec le lien Firebase contenu dans l'URL, pour l'adresse invitée. */
  const signInWithLink = async () => {
    if (!invitation) return
    setBusy(true)
    setError(null)
    try {
      await completeLinkSignIn(invitation.email)
    } catch (e) {
      setError(toFrenchError(e))
    } finally {
      setLinkPresent(false)
      setBusy(false)
    }
  }

  // Arrivée depuis l'e-mail, personne de connecté : connexion automatique.
  useEffect(() => {
    if (!authLoading && !user && linkPresent && usable && !autoSignInTried.current) {
      autoSignInTried.current = true
      void signInWithLink()
    }
  })

  const requestNewLink = async () => {
    if (!invitation) return
    setBusy(true)
    setError(null)
    try {
      await sendLoginLink(invitation.email, invitationUrl(invitation))
      setInfo(`Un nouveau lien a été envoyé à ${invitation.email}.`)
    } catch (e) {
      setError(toFrenchError(e))
    } finally {
      setBusy(false)
    }
  }

  const accept = async () => {
    setBusy(true)
    setError(null)
    try {
      const res = await acceptInvitation(atomeId, token)
      navigate(res.role === 'positron' ? `/${res.atomeSlug}/foyer?bienvenue=1` : `/${res.atomeSlug}`, { replace: true })
    } catch (e) {
      setError(toFrenchError(e))
    } finally {
      setBusy(false)
    }
  }

  const here = `/invite/${token}?a=${atomeId}`
  const needsCompletion = Boolean(user && !emailMismatch && !completed && (!profile || !hasPassword(user)))

  let body: ReactNode
  if (loading || authLoading) body = <Spinner />
  else if (!invitation) body = <Alert tone="error">{error ?? 'Invitation introuvable.'}</Alert>
  else if (!usable)
    body = (
      <Alert tone="warning">
        Cette invitation {invitation.status === 'accepted' ? 'a déjà été utilisée' : expired ? 'a expiré' : 'a été révoquée'}. Demandez un nouveau lien à{' '}
        {invitation.invitedByName}.
      </Alert>
    )
  else
    body = (
      <div className="space-y-4">
        <div className="text-center">
          <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-500" aria-hidden />
          <h1 className="mt-2 text-lg font-semibold">Invitation dans l'Atome « {invitation.atomeName} »</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            {invitation.invitedByName} vous invite en tant que <strong>{ROLE_LABELS[invitation.role]}</strong>.
          </p>
          {invitation.role === 'neutron' && <p className="mt-1 text-xs text-slate-500">Accès en lecture seule au planning et aux statistiques.</p>}
        </div>

        {busy && !user ? (
          <Spinner label="Connexion en cours…" />
        ) : !user ? (
          <div className="grid gap-2">
            <p className="text-center text-sm text-slate-500">
              Ouvrez le lien reçu par e-mail sur cet appareil, ou connectez-vous avec <strong>{invitation.email}</strong>.
            </p>
            <Button icon={<Mail className="h-4 w-4" />} onClick={() => void requestNewLink()} loading={busy}>
              M'envoyer un nouveau lien de connexion
            </Button>
            <Button
              variant="secondary"
              onClick={() => navigate(`/auth?email=${encodeURIComponent(invitation.email)}&next=${encodeURIComponent(here)}`)}
            >
              J'ai déjà un compte (mot de passe)
            </Button>
          </div>
        ) : emailMismatch ? (
          <Alert tone="warning">
            <MailWarning className="mb-1 inline h-4 w-4" /> Cette invitation est destinée à <strong>{invitation.email}</strong>, mais vous êtes connecté·e avec{' '}
            {user.email}.{' '}
            {linkPresent ? (
              <button type="button" className="font-medium underline" onClick={() => void signInWithLink()}>
                Continuer avec {invitation.email}
              </button>
            ) : (
              <button type="button" className="font-medium underline" onClick={() => void logout()}>
                Changer de compte
              </button>
            )}
          </Alert>
        ) : needsCompletion && user ? (
          <CompleteProfileForm requirePassword={!hasPassword(user)} onDone={() => setCompleted(true)} />
        ) : (
          <Button className="w-full" loading={busy} onClick={() => void accept()}>
            Rejoindre l'Atome
          </Button>
        )}
        {info && <Alert tone="success">{info}</Alert>}
        {error && <Alert tone="error">{error}</Alert>}
      </div>
    )

  return (
    <CenteredLayout>
      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-center">
          <Logo className="scale-125" />
        </div>
        <Card className="p-6">{body}</Card>
      </div>
    </CenteredLayout>
  )
}
