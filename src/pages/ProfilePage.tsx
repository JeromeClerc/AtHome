import { BellOff, BellRing, KeyRound, Mail, Save, ShieldCheck, Smartphone } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { Alert, Badge, Button, Card, CardHeader, Checkbox, Input } from '@/components/ui'
import { HOUSEHOLD_STYLES, ROLE_BADGE, ROLE_LABELS } from '@/config/theme'
import { useAtome } from '@/hooks/useAtome'
import { useAuth } from '@/hooks/useAuth'
import { confirmPhoneCode, hasPassword, requestEmailChange, sendPhoneVerificationCode, setPassword } from '@/services/auth.service'
import { toFrenchError } from '@/services/firestore.helpers'
import {
  currentDeviceToken,
  disablePushOnThisDevice,
  enablePushOnThisDevice,
  getPushSupport,
  setPushOptIn,
  type PushSupport,
} from '@/services/messaging.service'
import { updateUserProfile } from '@/services/user.service'
import { EMAIL_REGEX, formatSwissPhone, normalizeSwissPhone } from '@/utils/strings'

type Msg = { tone: 'success' | 'error' | 'info' | 'warning'; text: string } | null

const RECAPTCHA_ID = 'recaptcha-phone'

/**
 * Mobile & notifications :
 * 1. vérification du numéro par SMS (code envoyé par Firebase Authentication, fournisseur Téléphone) ;
 * 2. activation des notifications push sur ce téléphone (Firebase Cloud Messaging).
 */
function PhoneNotificationsCard() {
  const { user, profile, refresh } = useAuth()
  const [phone, setPhone] = useState(formatSwissPhone(user?.phoneNumber ?? profile?.phone))
  const [verificationId, setVerificationId] = useState<string | null>(null)
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<Msg>(null)
  const [support, setSupport] = useState<PushSupport | null>(null)
  const [deviceEnabled, setDeviceEnabled] = useState(() => currentDeviceToken() !== null)

  useEffect(() => {
    void getPushSupport().then(setSupport)
  }, [])

  if (!user || !profile) return null
  const verifiedPhone = user.phoneNumber
  const run = async (fn: () => Promise<void>) => {
    setBusy(true)
    setMsg(null)
    try {
      await fn()
    } catch (e) {
      setMsg({ tone: 'error', text: toFrenchError(e) })
    } finally {
      setBusy(false)
    }
  }

  const sendCode = () =>
    run(async () => {
      const e164 = normalizeSwissPhone(phone)
      if (!e164) throw new Error('Numéro invalide (ex. +41 79 123 45 67).')
      setVerificationId(await sendPhoneVerificationCode(e164, RECAPTCHA_ID))
      setMsg({ tone: 'info', text: `Code envoyé par SMS au ${formatSwissPhone(e164)}.` })
    })

  const confirm = (e: FormEvent) => {
    e.preventDefault()
    if (!verificationId) return
    void run(async () => {
      const verified = await confirmPhoneCode(verificationId, code)
      await refresh()
      setVerificationId(null)
      setCode('')
      setMsg({ tone: 'success', text: `Numéro ${formatSwissPhone(verified)} vérifié.` })
    })
  }

  const supportHint: Record<PushSupport, string> = {
    supported: '',
    'not-configured': "Les notifications push ne sont pas configurées (clé VAPID manquante, voir docs/FIREBASE_SETUP.md).",
    'ios-needs-install': "Sur iPhone / iPad : touchez Partager › « Sur l'écran d'accueil », puis ouvrez At Home depuis l'icône pour activer les notifications.",
    unsupported: 'Ce navigateur ne prend pas en charge les notifications push.',
  }

  return (
    <Card>
      <CardHeader
        title={
          <span className="inline-flex items-center gap-2">
            <Smartphone className="h-5 w-5" /> Mobile & notifications
          </span>
        }
        description="Votre numéro est vérifié par SMS, puis les notifications (demandes à valider, nouvelles notes) arrivent sur votre téléphone."
      />
      <div className="space-y-5 p-5">
        {/* Étape 1 : vérification du numéro */}
        <section className="space-y-3">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            1. Numéro de mobile
            {verifiedPhone && (
              <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200">
                <ShieldCheck className="h-3 w-3" /> Vérifié : {formatSwissPhone(verifiedPhone)}
              </Badge>
            )}
          </h3>
          {!verificationId ? (
            <div className="flex flex-wrap items-end gap-3">
              <Input
                wrapperClassName="flex-1 min-w-56"
                label={verifiedPhone ? 'Changer de numéro' : 'Mobile'}
                type="tel"
                autoComplete="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+41 79 123 45 67"
              />
              <Button
                variant="secondary"
                loading={busy}
                disabled={!phone.trim() || normalizeSwissPhone(phone) === verifiedPhone}
                onClick={() => void sendCode()}
              >
                Recevoir le code SMS
              </Button>
            </div>
          ) : (
            <form onSubmit={confirm} className="flex flex-wrap items-end gap-3">
              <Input
                wrapperClassName="flex-1 min-w-40"
                label="Code reçu par SMS"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                placeholder="123456"
              />
              <Button type="submit" loading={busy} disabled={code.length < 6}>
                Vérifier
              </Button>
              <Button variant="ghost" onClick={() => setVerificationId(null)}>
                Annuler
              </Button>
            </form>
          )}
          {/* Conteneur du reCAPTCHA invisible exigé par Firebase pour l'envoi de SMS. */}
          <div id={RECAPTCHA_ID} />
        </section>

        {/* Étape 2 : notifications push */}
        <section className="space-y-3 border-t border-slate-200 pt-4 dark:border-slate-800">
          <h3 className="text-sm font-semibold">2. Notifications sur ce téléphone</h3>
          {!verifiedPhone ? (
            <p className="text-sm text-slate-500">Vérifiez d'abord votre numéro de mobile.</p>
          ) : support && support !== 'supported' ? (
            <Alert tone="warning">{supportHint[support]}</Alert>
          ) : (
            <>
              <div className="flex flex-wrap gap-2">
                {deviceEnabled ? (
                  <Button
                    variant="secondary"
                    icon={<BellOff className="h-4 w-4" />}
                    loading={busy}
                    onClick={() =>
                      void run(async () => {
                        await disablePushOnThisDevice(user.uid)
                        setDeviceEnabled(false)
                        setMsg({ tone: 'info', text: 'Notifications désactivées sur cet appareil.' })
                      })
                    }
                  >
                    Désactiver sur cet appareil
                  </Button>
                ) : (
                  <Button
                    icon={<BellRing className="h-4 w-4" />}
                    loading={busy}
                    onClick={() =>
                      void run(async () => {
                        await enablePushOnThisDevice(user.uid)
                        setDeviceEnabled(true)
                        setMsg({ tone: 'success', text: 'Notifications activées sur cet appareil.' })
                      })
                    }
                  >
                    Activer les notifications sur cet appareil
                  </Button>
                )}
              </div>
              <Checkbox
                label="Recevoir les notifications sur tous mes appareils enregistrés"
                checked={profile.pushOptIn}
                onChange={(e) => void run(() => setPushOptIn(user.uid, e.target.checked))}
              />
            </>
          )}
        </section>
        {msg && <Alert tone={msg.tone}>{msg.text}</Alert>}
      </div>
    </Card>
  )
}

/** Mot de passe : définir (compte créé par lien e-mail) ou changer. */
function PasswordCard() {
  const { user } = useAuth()
  const [password, setPwd] = useState('')
  const [confirm, setConfirm] = useState('')
  const [msg, setMsg] = useState<Msg>(null)
  const [saving, setSaving] = useState(false)
  if (!user) return null
  const has = hasPassword(user)

  const save = async (e: FormEvent) => {
    e.preventDefault()
    setMsg(null)
    if (password.length < 8) return setMsg({ tone: 'error', text: 'Le mot de passe doit contenir au moins 8 caractères.' })
    if (password !== confirm) return setMsg({ tone: 'error', text: 'Les mots de passe ne correspondent pas.' })
    setSaving(true)
    try {
      await setPassword(password)
      setPwd('')
      setConfirm('')
      setMsg({ tone: 'success', text: 'Mot de passe enregistré.' })
    } catch (err) {
      setMsg({ tone: 'error', text: toFrenchError(err) })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader title={has ? 'Changer le mot de passe' : 'Définir un mot de passe'} description="Vous pouvez aussi toujours vous connecter par lien e-mail." />
      <form onSubmit={save} className="grid gap-3 p-5 sm:grid-cols-2" noValidate>
        <Input label="Nouveau mot de passe" type="password" autoComplete="new-password" value={password} onChange={(e) => setPwd(e.target.value)} />
        <Input label="Confirmer" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        {msg && (
          <Alert tone={msg.tone} className="sm:col-span-2">
            {msg.text}
          </Alert>
        )}
        <div className="flex justify-end sm:col-span-2">
          <Button type="submit" variant="secondary" loading={saving} icon={<KeyRound className="h-4 w-4" />}>
            Enregistrer
          </Button>
        </div>
      </form>
    </Card>
  )
}

/** Données personnelles : nom, prénom, e-mail (avec confirmation), mot de passe, mobile et notifications. */
export function ProfilePage() {
  const { profile, user } = useAuth()
  const { atome, role, household } = useAtome()
  const [firstName, setFirstName] = useState(profile?.firstName ?? '')
  const [lastName, setLastName] = useState(profile?.lastName ?? '')
  const [email, setEmail] = useState(user?.email ?? '')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<Msg>(null)
  const [emailMsg, setEmailMsg] = useState<Msg>(null)

  if (!profile || !user) return null

  const save = async (e: FormEvent) => {
    e.preventDefault()
    setMsg(null)
    if (!firstName.trim() || !lastName.trim()) return setMsg({ tone: 'error', text: 'Prénom et nom sont requis.' })
    setSaving(true)
    try {
      await updateUserProfile(user.uid, { firstName: firstName.trim(), lastName: lastName.trim() }, profile.atomeIds)
      setMsg({ tone: 'success', text: 'Profil enregistré.' })
    } catch (err) {
      setMsg({ tone: 'error', text: toFrenchError(err) })
    } finally {
      setSaving(false)
    }
  }

  const changeEmail = async () => {
    setEmailMsg(null)
    if (!EMAIL_REGEX.test(email.trim())) return setEmailMsg({ tone: 'error', text: 'Adresse e-mail invalide.' })
    try {
      await requestEmailChange(email)
      setEmailMsg({ tone: 'info', text: `Un lien de confirmation a été envoyé à ${email}. Le changement sera effectif après validation.` })
    } catch (err) {
      setEmailMsg({ tone: 'error', text: toFrenchError(err) })
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Mon profil</h1>
        <p className="text-sm text-slate-500">Vos données personnelles, visibles par les membres de vos Atomes.</p>
      </div>

      <Card className="flex flex-wrap items-center gap-3 p-5 text-sm">
        <span>Dans l'Atome « {atome.name} » :</span>
        <Badge className={ROLE_BADGE[role]}>{ROLE_LABELS[role]}</Badge>
        {household && <span className={HOUSEHOLD_STYLES[household].text}>{atome.households[household].label}</span>}
      </Card>

      <Card>
        <CardHeader title="Informations personnelles" />
        <form onSubmit={save} className="grid gap-4 p-5 sm:grid-cols-2" noValidate>
          <Input label="Prénom" required autoComplete="given-name" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Camille" />
          <Input label="Nom" required autoComplete="family-name" value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Rochat" />
          {msg && (
            <Alert tone={msg.tone} className="sm:col-span-2">
              {msg.text}
            </Alert>
          )}
          <div className="flex justify-end sm:col-span-2">
            <Button type="submit" loading={saving} icon={<Save className="h-4 w-4" />}>
              Enregistrer
            </Button>
          </div>
        </form>
      </Card>

      <PhoneNotificationsCard />

      <Card>
        <CardHeader title="Adresse e-mail" description="Sert à la connexion et aux invitations." />
        <div className="space-y-3 p-5">
          <div className="flex flex-wrap items-end gap-3">
            <Input wrapperClassName="flex-1 min-w-56" label="E-mail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <Button variant="secondary" icon={<Mail className="h-4 w-4" />} disabled={email.trim() === user.email} onClick={() => void changeEmail()}>
              Changer l'e-mail
            </Button>
          </div>
          {emailMsg && <Alert tone={emailMsg.tone}>{emailMsg.text}</Alert>}
        </div>
      </Card>

      <PasswordCard />
    </div>
  )
}
