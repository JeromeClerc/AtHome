import { Atom, Ban, Copy, Mail, MailCheck, RefreshCw, RotateCw, Save, Send, Users } from 'lucide-react'
import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ScheduleGenerator } from '@/components/calendar/ScheduleGenerator'
import { CenteredLayout } from '@/components/layout/MainLayout'
import { Logo } from '@/components/layout/Logo'
import { Alert, Badge, Button, Card, CardHeader, Input, Select } from '@/components/ui'
import { HOUSEHOLD_STYLES, ROLE_BADGE, ROLE_LABELS } from '@/config/theme'
import { useAtome, useMyAtomes } from '@/hooks/useAtome'
import { useAuth } from '@/hooks/useAuth'
import { createAtome, isSlugAvailable, renameAtome, suggestSlug, updateHousehold } from '@/services/atome.service'
import { resendVerification } from '@/services/auth.service'
import { toFrenchError } from '@/services/firestore.helpers'
import { createInvitation, invitationUrl, revokeInvitation, sendInvitationEmail, subscribeInvitations } from '@/services/invitation.service'
import type { Household, HouseholdInfo, Invitation, InvitationRole } from '@/types'
import { cn } from '@/utils/cn'
import { formatSwiss, toIsoDate } from '@/utils/dates'
import { EMAIL_REGEX, slugify } from '@/utils/strings'

type HouseholdForm = Pick<HouseholdInfo, 'label' | 'street' | 'npa' | 'city'>

const emptyHousehold = (label: string): HouseholdForm => ({ label, street: '', npa: '', city: '' })

/** Champs d'adresse d'un foyer (placeholders suisses). */
function HouseholdFields({ value, onChange, disabled }: { value: HouseholdForm; onChange: (v: HouseholdForm) => void; disabled?: boolean }) {
  const set = (k: keyof HouseholdForm) => (e: ChangeEvent<HTMLInputElement>) => onChange({ ...value, [k]: e.target.value })
  return (
    <div className="grid gap-3 sm:grid-cols-6">
      <Input wrapperClassName="sm:col-span-6" label="Nom du foyer" required value={value.label} onChange={set('label')} placeholder="Chez Papa" disabled={disabled} />
      <Input wrapperClassName="sm:col-span-6" label="Rue et numéro" value={value.street ?? ''} onChange={set('street')} placeholder="Rue de Bourg 12" disabled={disabled} />
      <Input wrapperClassName="sm:col-span-2" label="NPA" inputMode="numeric" maxLength={4} value={value.npa ?? ''} onChange={set('npa')} placeholder="1003" disabled={disabled} />
      <Input wrapperClassName="sm:col-span-4" label="Localité" value={value.city ?? ''} onChange={set('city')} placeholder="Lausanne" disabled={disabled} />
    </div>
  )
}

// ─── Création d'un Atome (/setup) ────────────────────────────────────────────

/**
 * Création d'un Atome par le parent initiateur (Électron) : nom + slug unique, son foyer,
 * puis le foyer Positron (l'invitation du second parent se fait ensuite depuis « Foyer & invitations »).
 */
export function SetupAtomePage() {
  const { profile, emailVerified, refresh, user } = useAuth()
  const { atomes } = useMyAtomes()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [slugTouched, setSlugTouched] = useState(false)
  const [slugOk, setSlugOk] = useState<boolean | null>(null)
  const [electron, setElectron] = useState<HouseholdForm>(emptyHousehold(''))
  const [positron, setPositron] = useState<HouseholdForm>(emptyHousehold(''))
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [verifyMsg, setVerifyMsg] = useState<string | null>(null)

  useEffect(() => {
    if (profile && !electron.label) setElectron((e) => ({ ...e, label: `Chez ${profile.firstName}` }))
  }, [profile, electron.label])

  useEffect(() => {
    if (!slugTouched) setSlug(slugify(name))
  }, [name, slugTouched])

  useEffect(() => {
    if (!slug) return setSlugOk(null)
    let active = true
    const t = setTimeout(() => {
      isSlugAvailable(slug)
        .then((ok) => active && setSlugOk(ok))
        .catch(() => active && setSlugOk(null))
    }, 400)
    return () => {
      active = false
      clearTimeout(t)
    }
  }, [slug])

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!profile) return
    setError(null)
    if (!name.trim()) return setError("Donnez un nom à votre Atome.")
    if (!electron.label.trim() || !positron.label.trim()) return setError('Nommez les deux foyers.')
    setSaving(true)
    try {
      const finalSlug = slugOk ? slug : await suggestSlug(name)
      const atome = await createAtome({ name, slug: finalSlug, electron, positron: { ...positron, inviteEmail: null } }, profile)
      navigate(`/${atome.slug}/foyer?nouveau=1`)
    } catch (err) {
      setError(toFrenchError(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <CenteredLayout>
      <div className="w-full max-w-2xl space-y-4">
        <div className="flex items-center justify-between">
          <Logo />
          {atomes.length > 0 && (
            <Link to="/" className="text-sm text-brand-600 hover:underline">
              Mes Atomes
            </Link>
          )}
        </div>

        {!emailVerified ? (
          <Card className="p-6">
            <div className="flex flex-col items-center gap-3 text-center">
              <MailCheck className="h-10 w-10 text-brand-600" aria-hidden />
              <h1 className="text-lg font-semibold">Confirmez votre adresse e-mail</h1>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Un lien de validation a été envoyé à <strong>{user?.email}</strong>. Cliquez dessus, puis revenez ici.
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                <Button icon={<RefreshCw className="h-4 w-4" />} onClick={() => void refresh().then(() => setVerifyMsg('Statut mis à jour.'))}>
                  J'ai validé mon e-mail
                </Button>
                <Button
                  variant="secondary"
                  icon={<Mail className="h-4 w-4" />}
                  onClick={() =>
                    void resendVerification()
                      .then(() => setVerifyMsg('E-mail renvoyé.'))
                      .catch((e: unknown) => setVerifyMsg(toFrenchError(e)))
                  }
                >
                  Renvoyer l'e-mail
                </Button>
              </div>
              {verifyMsg && <p className="text-xs text-slate-500">{verifyMsg}</p>}
            </div>
          </Card>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <Card>
              <CardHeader
                title={
                  <span className="inline-flex items-center gap-2">
                    <Atom className="h-5 w-5 text-brand-600" /> Créer votre Atome
                  </span>
                }
                description="L'Atome est l'espace privé de votre famille. Vous en serez l'Électron (foyer 1)."
              />
              <div className="grid gap-3 p-5 sm:grid-cols-2">
                <Input label="Nom de l'Atome" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Famille Rochat" />
                <Input
                  label="Adresse (slug)"
                  value={slug}
                  onChange={(e) => {
                    setSlugTouched(true)
                    setSlug(slugify(e.target.value))
                  }}
                  hint={
                    slugOk === false ? undefined : (
                      <>
                        {window.location.host}/<strong>{slug || '…'}</strong>
                      </>
                    )
                  }
                  error={slugOk === false ? 'Déjà utilisé : un suffixe sera ajouté automatiquement.' : null}
                />
              </div>
            </Card>

            <Card>
              <CardHeader
                title={<span className={HOUSEHOLD_STYLES.electron.text}>Électron · Mon foyer</span>}
                description="Le foyer du parent qui crée l'Atome."
              />
              <div className="p-5">
                <HouseholdFields value={electron} onChange={setElectron} />
              </div>
            </Card>

            <Card>
              <CardHeader
                title={<span className={HOUSEHOLD_STYLES.positron.text}>Positron · L'autre foyer</span>}
                description="Vous pourrez inviter l'autre parent par e-mail à l'étape suivante. Il complétera lui-même son adresse."
              />
              <div className="p-5">
                <Input label="Nom du foyer" required value={positron.label} onChange={(e) => setPositron({ ...positron, label: e.target.value })} placeholder="Chez Maman" />
              </div>
            </Card>

            {error && <Alert tone="error">{error}</Alert>}
            <div className="flex justify-end">
              <Button type="submit" size="lg" loading={saving} icon={<Atom className="h-5 w-5" />}>
                Créer l'Atome
              </Button>
            </div>
          </form>
        )}
      </div>
    </CenteredLayout>
  )
}

// ─── Gestion des foyers et invitations (/:slug/foyer) ────────────────────────

function HouseholdCard({ household }: { household: Household }) {
  const { atome, household: mine } = useAtome()
  const info = atome.households[household]
  const [form, setForm] = useState<HouseholdForm>({ label: info.label, street: info.street ?? '', npa: info.npa ?? '', city: info.city ?? '' })
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ tone: 'success' | 'error'; text: string } | null>(null)
  const editable = mine === household
  const owner = info.ownerUid ? atome.memberProfiles[info.ownerUid] : null

  const save = async () => {
    setSaving(true)
    setMsg(null)
    try {
      await updateHousehold(atome.id, household, form)
      setMsg({ tone: 'success', text: 'Foyer enregistré.' })
    } catch (e) {
      setMsg({ tone: 'error', text: toFrenchError(e) })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card className={cn('border-t-4', household === 'electron' ? 'border-t-sky-500' : 'border-t-amber-500')}>
      <CardHeader
        title={<span className={HOUSEHOLD_STYLES[household].text}>{ROLE_LABELS[household]}</span>}
        description={owner ? `Parent : ${owner.displayName}` : info.inviteEmail ? `Invitation envoyée à ${info.inviteEmail}` : 'Parent pas encore invité'}
      />
      <div className="space-y-3 p-5">
        <HouseholdFields value={form} onChange={setForm} disabled={!editable} />
        {!editable && <p className="text-xs text-slate-500">Seul le parent de ce foyer peut modifier ces informations.</p>}
        {msg && <Alert tone={msg.tone}>{msg.text}</Alert>}
        {editable && (
          <div className="flex justify-end">
            <Button size="sm" loading={saving} icon={<Save className="h-4 w-4" />} onClick={save}>
              Enregistrer
            </Button>
          </div>
        )}
      </div>
    </Card>
  )
}

function InvitationsCard() {
  const { atome, protons, isParent } = useAtome()
  const { profile } = useAuth()
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const positronFree = !atome.households.positron.ownerUid
  const [role, setRole] = useState<InvitationRole>(positronFree ? 'positron' : 'neutron')
  const [email, setEmail] = useState('')
  const [protonId, setProtonId] = useState('')
  const [sending, setSending] = useState(false)
  const [msg, setMsg] = useState<{ tone: 'success' | 'error'; text: string } | null>(null)
  const [copied, setCopied] = useState<string | null>(null)

  useEffect(() => subscribeInvitations(atome.id, setInvitations, () => setInvitations([])), [atome.id])

  const send = async (e: FormEvent) => {
    e.preventDefault()
    if (!profile) return
    setMsg(null)
    if (!EMAIL_REGEX.test(email.trim())) return setMsg({ tone: 'error', text: 'Adresse e-mail invalide.' })
    if (role === 'proton' && !protonId) return setMsg({ tone: 'error', text: "Choisissez l'enfant à associer." })
    setSending(true)
    try {
      const inv = await createInvitation(atome, { email, role, protonId: role === 'proton' ? protonId : null }, profile)
      if (role === 'positron') await updateHousehold(atome.id, 'positron', { inviteEmail: inv.email })
      setEmail('')
      setMsg({
        tone: 'success',
        text: `Invitation envoyée à ${inv.email} par Firebase (e-mail « Connexion à At Home »). Le lien de l'e-mail connecte directement l'invité·e.`,
      })
    } catch (err) {
      setMsg({ tone: 'error', text: toFrenchError(err) })
    } finally {
      setSending(false)
    }
  }

  const resend = async (inv: Invitation) => {
    setMsg(null)
    try {
      await sendInvitationEmail(inv)
      setMsg({ tone: 'success', text: `Nouvel e-mail envoyé à ${inv.email}.` })
    } catch (err) {
      setMsg({ tone: 'error', text: toFrenchError(err) })
    }
  }

  const copy = async (inv: Invitation) => {
    await navigator.clipboard.writeText(invitationUrl(inv))
    setCopied(inv.token)
    setTimeout(() => setCopied(null), 2000)
  }

  const members = Object.entries(atome.memberProfiles)

  return (
    <Card>
      <CardHeader
        title={
          <span className="inline-flex items-center gap-2">
            <Users className="h-5 w-5" /> Membres & invitations
          </span>
        }
        description="Invitez l'autre parent (Positron), des tiers neutres en lecture seule (Neutrons) ou un enfant (Proton)."
      />
      <div className="space-y-5 p-5">
        <ul className="divide-y divide-slate-100 dark:divide-slate-800">
          {members.map(([uid, m]) => (
            <li key={uid} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
              <span>
                <span className="font-medium">{m.displayName}</span> <span className="text-slate-500">· {m.email}</span>
              </span>
              <Badge className={ROLE_BADGE[m.role]}>{ROLE_LABELS[m.role]}</Badge>
            </li>
          ))}
        </ul>

        {isParent && (
          <form onSubmit={send} className="grid gap-3 rounded-xl bg-slate-50 p-4 sm:grid-cols-6 dark:bg-slate-800/50">
            <Select wrapperClassName="sm:col-span-2" label="Rôle" value={role} onChange={(e) => setRole(e.target.value as InvitationRole)}>
              {positronFree && <option value="positron">Positron (autre parent)</option>}
              <option value="neutron">Neutron (lecture seule)</option>
              <option value="proton">Proton (enfant)</option>
            </Select>
            <Input
              wrapperClassName={role === 'proton' ? 'sm:col-span-2' : 'sm:col-span-4'}
              label="E-mail"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={role === 'neutron' ? 'mediation@cabinet-lausanne.ch' : 'prenom.nom@bluewin.ch'}
            />
            {role === 'proton' && (
              <Select wrapperClassName="sm:col-span-2" label="Enfant" value={protonId} onChange={(e) => setProtonId(e.target.value)}>
                <option value="">Choisir…</option>
                {protons
                  .filter((p) => !p.linkedUid)
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.firstName} {p.lastName}
                    </option>
                  ))}
              </Select>
            )}
            <div className="flex items-end sm:col-span-6 sm:justify-end">
              <Button type="submit" loading={sending} icon={<Send className="h-4 w-4" />}>
                Envoyer l'invitation
              </Button>
            </div>
          </form>
        )}
        {msg && <Alert tone={msg.tone}>{msg.text}</Alert>}

        {invitations.length > 0 && (
          <div>
            <h3 className="mb-2 text-sm font-semibold">Invitations envoyées</h3>
            <ul className="space-y-2">
              {invitations.map((inv) => (
                <li key={inv.token} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-800">
                  <span className="min-w-0">
                    <span className="font-medium">{inv.email}</span>{' '}
                    <Badge className={ROLE_BADGE[inv.role]}>{ROLE_LABELS[inv.role]}</Badge>{' '}
                    <span className="text-xs text-slate-500">
                      {inv.status === 'pending' ? `expire le ${inv.expiresAt ? formatSwiss(toIsoDate(inv.expiresAt.toDate())) : '—'}` : inv.status === 'accepted' ? 'acceptée' : 'révoquée'}
                    </span>
                  </span>
                  {inv.status === 'pending' && isParent && (
                    <span className="flex gap-1">
                      <Button size="sm" variant="ghost" icon={<RotateCw className="h-4 w-4" />} onClick={() => void resend(inv)}>
                        Renvoyer
                      </Button>
                      <Button size="sm" variant="ghost" icon={<Copy className="h-4 w-4" />} onClick={() => void copy(inv)}>
                        {copied === inv.token ? 'Copié !' : 'Lien'}
                      </Button>
                      <Button size="sm" variant="ghost" icon={<Ban className="h-4 w-4" />} onClick={() => void revokeInvitation(atome.id, inv.token)}>
                        Révoquer
                      </Button>
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Card>
  )
}

function AtomeNameCard() {
  const { atome, isParent } = useAtome()
  const [name, setName] = useState(atome.name)
  const [saving, setSaving] = useState(false)
  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-end gap-3">
        <Input wrapperClassName="flex-1 min-w-48" label="Nom de l'Atome" value={name} onChange={(e) => setName(e.target.value)} disabled={!isParent} hint={`Adresse : /${atome.slug}`} />
        {isParent && (
          <Button
            variant="secondary"
            loading={saving}
            disabled={!name.trim() || name === atome.name}
            onClick={() => {
              setSaving(true)
              void renameAtome(atome.id, name).finally(() => setSaving(false))
            }}
          >
            Renommer
          </Button>
        )}
      </div>
    </Card>
  )
}

/** Page « Foyer & invitations » : foyers, membres, invitations et générateur de planning. */
export function FoyerPage() {
  const { isParent, protons, atome } = useAtome()
  const [params] = useSearchParams()
  const isNew = params.get('nouveau') === '1'
  const welcome = params.get('bienvenue') === '1'

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Foyer & invitations</h1>
        <p className="text-sm text-slate-500">Gérez les deux foyers, les membres de l'Atome et générez le planning.</p>
      </div>
      {isNew && (
        <Alert tone="success">
          Votre Atome est créé ! Prochaines étapes : <Link to={`/${atome.slug}/enfants`} className="font-medium underline">ajouter les enfants</Link>, inviter
          l'autre parent ci-dessous, puis générer le planning.
        </Alert>
      )}
      {welcome && <Alert tone="success">Bienvenue dans l'Atome ! Complétez les informations de votre foyer ci-dessous.</Alert>}

      <AtomeNameCard />
      <div className="grid gap-6 lg:grid-cols-2">
        <HouseholdCard household="electron" />
        <HouseholdCard household="positron" />
      </div>
      <InvitationsCard />
      {isParent &&
        (protons.length > 0 ? (
          <ScheduleGenerator />
        ) : (
          <Alert tone="info">
            Ajoutez au moins un enfant dans <Link to={`/${atome.slug}/enfants`} className="font-medium underline">Enfants</Link> pour générer le planning.
          </Alert>
        ))}
    </div>
  )
}
