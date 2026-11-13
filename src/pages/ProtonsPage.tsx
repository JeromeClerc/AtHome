import { Baby, Lock, Pencil, Plus, Trash2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Alert, Badge, Button, Card, EmptyState, Input, Modal, Select } from '@/components/ui'
import { GENDER_LABELS, protonColor } from '@/config/theme'
import { useAtome } from '@/hooks/useAtome'
import { useAuth } from '@/hooks/useAuth'
import { toFrenchError } from '@/services/firestore.helpers'
import { createProton, deleteProton, updateProton } from '@/services/proton.service'
import type { Gender, Proton, ProtonInput } from '@/types'
import { canParentsEdit, computeAge, majorityDate } from '@/utils/age'
import { cn } from '@/utils/cn'
import { formatSwiss, isIsoDate, toIsoDate } from '@/utils/dates'
import { EMAIL_REGEX, formatSwissPhone, normalizeSwissPhone } from '@/utils/strings'

interface FormState {
  firstName: string
  lastName: string
  birthDate: string
  gender: Gender
  email: string
  phone: string
}

const emptyForm: FormState = { firstName: '', lastName: '', birthDate: '', gender: 'female', email: '', phone: '' }

function toForm(p: Proton): FormState {
  return {
    firstName: p.firstName,
    lastName: p.lastName,
    birthDate: p.birthDate,
    gender: p.gender,
    email: p.email ?? '',
    phone: formatSwissPhone(p.phone),
  }
}

/** Formulaire d'ajout / édition d'un enfant. */
function ProtonForm({ initial, onSubmit, onCancel }: { initial: FormState; onSubmit: (input: ProtonInput) => Promise<void>; onCancel: () => void }) {
  const [form, setForm] = useState<FormState>(initial)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm((f) => ({ ...f, [k]: v }))

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!form.firstName.trim() || !form.lastName.trim()) return setError('Prénom et nom sont requis.')
    if (!isIsoDate(form.birthDate) || form.birthDate > toIsoDate(new Date())) return setError('Date de naissance invalide.')
    if (form.email && !EMAIL_REGEX.test(form.email.trim())) return setError('Adresse e-mail invalide.')
    const phone = form.phone.trim() ? normalizeSwissPhone(form.phone) : null
    if (form.phone.trim() && !phone) return setError('Numéro de mobile invalide (ex. +41 79 123 45 67).')
    setSaving(true)
    try {
      await onSubmit({ firstName: form.firstName, lastName: form.lastName, birthDate: form.birthDate, gender: form.gender, email: form.email || null, phone })
    } catch (err) {
      setError(toFrenchError(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2" noValidate>
      <Input label="Prénom" required value={form.firstName} onChange={(e) => set('firstName', e.target.value)} placeholder="Léa" />
      <Input label="Nom" required value={form.lastName} onChange={(e) => set('lastName', e.target.value)} placeholder="Rochat" />
      <Input
        label="Date de naissance"
        type="date"
        required
        value={form.birthDate}
        max={toIsoDate(new Date())}
        onChange={(e) => set('birthDate', e.target.value)}
        hint={isIsoDate(form.birthDate) ? `${computeAge(form.birthDate)} ans · né·e le ${formatSwiss(form.birthDate)}` : 'JJ.MM.AAAA'}
      />
      <Select label="Genre" value={form.gender} onChange={(e) => set('gender', e.target.value as Gender)}>
        {(Object.keys(GENDER_LABELS) as Gender[]).map((g) => (
          <option key={g} value={g}>
            {GENDER_LABELS[g]}
          </option>
        ))}
      </Select>
      <Input label="E-mail (facultatif)" type="email" value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="lea.rochat@bluewin.ch" />
      <Input label="Mobile (facultatif)" type="tel" value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="+41 79 123 45 67" />
      {error && (
        <Alert tone="error" className="sm:col-span-2">
          {error}
        </Alert>
      )}
      <div className="flex justify-end gap-2 sm:col-span-2">
        <Button variant="secondary" onClick={onCancel}>
          Annuler
        </Button>
        <Button type="submit" loading={saving}>
          Enregistrer
        </Button>
      </div>
    </form>
  )
}

/**
 * Gestion des enfants (Protons) : ajout, édition, suppression.
 * Règle de majorité : à 18 ans révolus, la fiche passe en lecture seule pour les parents ;
 * seul l'enfant (s'il a un compte lié) peut alors la modifier.
 */
export function ProtonsPage() {
  const { atome, protons, isParent } = useAtome()
  const { user } = useAuth()
  const [editing, setEditing] = useState<Proton | 'new' | null>(null)
  const [deleting, setDeleting] = useState<Proton | null>(null)
  const [error, setError] = useState<string | null>(null)

  const canEdit = (p: Proton) => (canParentsEdit(p.birthDate) ? isParent : p.linkedUid === user?.uid)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Enfants</h1>
          <p className="text-sm text-slate-500">Les Protons de l'Atome. Les deux parents peuvent modifier les fiches jusqu'aux 18 ans.</p>
        </div>
        {isParent && (
          <Button icon={<Plus className="h-4 w-4" />} onClick={() => setEditing('new')}>
            Ajouter un enfant
          </Button>
        )}
      </div>
      {error && <Alert tone="error">{error}</Alert>}

      {protons.length === 0 ? (
        <Card>
          <EmptyState icon={<Baby className="h-6 w-6" />} title="Aucun enfant enregistré">
            Ajoutez vos enfants pour pouvoir générer le planning d'alternance.
          </EmptyState>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {protons.map((p) => {
            const adult = !canParentsEdit(p.birthDate)
            return (
              <Card key={p.id} className="p-5">
                <div className="flex items-start gap-3">
                  <span className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-lg font-bold text-white', protonColor(p.colorIndex))}>
                    {p.firstName[0]?.toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">
                      {p.firstName} {p.lastName}
                    </p>
                    <p className="text-sm text-slate-500">
                      {computeAge(p.birthDate)} ans · {GENDER_LABELS[p.gender]} · {formatSwiss(p.birthDate)}
                    </p>
                  </div>
                  {adult && (
                    <Badge title="Données appartenant à l'enfant majeur">
                      <Lock className="h-3 w-3" /> Majeur·e
                    </Badge>
                  )}
                </div>
                <dl className="mt-3 space-y-1 text-sm">
                  {p.email && (
                    <div className="flex gap-2">
                      <dt className="text-slate-500">E-mail</dt>
                      <dd className="truncate">{p.email}</dd>
                    </div>
                  )}
                  {p.phone && (
                    <div className="flex gap-2">
                      <dt className="text-slate-500">Mobile</dt>
                      <dd>{formatSwissPhone(p.phone)}</dd>
                    </div>
                  )}
                  {!adult && (
                    <p className="text-xs text-slate-500">Majorité le {formatSwiss(toIsoDate(majorityDate(p.birthDate)))}</p>
                  )}
                  {p.linkedUid && <p className="text-xs text-emerald-600">Compte lié</p>}
                </dl>
                {canEdit(p) && (
                  <div className="mt-4 flex gap-2">
                    <Button size="sm" variant="secondary" icon={<Pencil className="h-4 w-4" />} onClick={() => setEditing(p)}>
                      Modifier
                    </Button>
                    {isParent && !adult && (
                      <Button size="sm" variant="ghost" icon={<Trash2 className="h-4 w-4" />} onClick={() => setDeleting(p)}>
                        Supprimer
                      </Button>
                    )}
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      )}

      {editing && (
        <Modal open onClose={() => setEditing(null)} title={editing === 'new' ? 'Ajouter un enfant' : `Modifier ${editing.firstName}`} size="lg">
          <ProtonForm
            initial={editing === 'new' ? emptyForm : toForm(editing)}
            onCancel={() => setEditing(null)}
            onSubmit={async (input) => {
              if (editing === 'new') await createProton(atome.id, input, protons.length)
              else await updateProton(atome.id, editing.id, input)
              setEditing(null)
            }}
          />
        </Modal>
      )}

      <Modal
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        title="Supprimer cette fiche ?"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleting(null)}>
              Annuler
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                if (!deleting) return
                deleteProton(atome.id, deleting.id)
                  .then(() => setDeleting(null))
                  .catch((e: unknown) => {
                    setError(toFrenchError(e))
                    setDeleting(null)
                  })
              }}
            >
              Supprimer
            </Button>
          </>
        }
      >
        <p className="text-sm">
          La fiche de <strong>{deleting?.firstName}</strong> sera supprimée. Les jours de garde déjà planifiés pour cet enfant restent dans l'historique.
        </p>
      </Modal>
    </div>
  )
}
