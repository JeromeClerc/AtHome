import { Plus, X } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Alert, Button, Checkbox, Input, Modal, Textarea } from '@/components/ui'
import { HOUSEHOLD_STYLES } from '@/config/theme'
import { useAtome } from '@/hooks/useAtome'
import { toFrenchError } from '@/services/firestore.helpers'
import type { ChangeRequestDraft, Household, IsoDate } from '@/types'
import { HOUSEHOLDS } from '@/types'
import { cn } from '@/utils/cn'
import { formatDateRanges, formatSwiss, isIsoDate } from '@/utils/dates'

export type ChangeRequestMode = 'propose' | 'counter_propose' | 'revise'

const TITLES: Record<ChangeRequestMode, { title: string; submit: string }> = {
  propose: { title: 'Demander une modification', submit: 'Envoyer la demande' },
  counter_propose: { title: 'Contre-proposition', submit: 'Envoyer la contre-proposition' },
  revise: { title: 'Réviser ma demande', submit: 'Renvoyer la demande' },
}

interface Props {
  open: boolean
  mode: ChangeRequestMode
  initial: ChangeRequestDraft
  onClose: () => void
  onSubmit: (draft: ChangeRequestDraft) => Promise<void>
}

/**
 * Formulaire de (contre-)proposition : jours concernés, enfants, foyer bénéficiaire et commentaire.
 * La modification n'est jamais appliquée directement : elle part en validation chez l'autre parent.
 */
export function ChangeRequestModal({ open, mode, initial, onClose, onSubmit }: Props) {
  const { atome, protons } = useAtome()
  // L'état est initialisé au montage : le parent monte la modale conditionnellement à chaque ouverture.
  const [dates, setDates] = useState<IsoDate[]>(() => [...initial.dates].sort())
  const [protonIds, setProtonIds] = useState<string[]>(initial.protonIds)
  const [target, setTarget] = useState<Household>(initial.targetHousehold)
  const [comment, setComment] = useState(initial.comment ?? '')
  const [extraDate, setExtraDate] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const addDate = () => {
    if (!isIsoDate(extraDate)) return
    setDates((d) => [...new Set([...d, extraDate])].sort())
    setExtraDate('')
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    if (dates.length === 0) return setError('Ajoutez au moins un jour.')
    if (protonIds.length === 0) return setError('Sélectionnez au moins un enfant.')
    setSaving(true)
    try {
      await onSubmit({ dates, protonIds, targetHousehold: target, comment: comment.trim() || null })
      onClose()
    } catch (err) {
      setError(toFrenchError(err))
    } finally {
      setSaving(false)
    }
  }

  const { title, submit: submitLabel } = TITLES[mode]
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      description={formatDateRanges(dates) || 'Aucun jour sélectionné'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Annuler
          </Button>
          <Button type="submit" form="change-request-form" loading={saving}>
            {submitLabel}
          </Button>
        </>
      }
    >
      <form id="change-request-form" onSubmit={submit} className="space-y-5">
        <Alert tone="info">
          Aucune modification n'est appliquée immédiatement : l'autre parent devra l'approuver, la modifier ou la
          rejeter.
        </Alert>

        <fieldset>
          <legend className="mb-2 text-sm font-medium">Attribuer ces jours à</legend>
          <div className="grid grid-cols-2 gap-2">
            {HOUSEHOLDS.map((h) => (
              <label
                key={h}
                className={cn(
                  'flex cursor-pointer flex-col rounded-xl border-2 p-3 text-sm transition',
                  target === h ? cn('border-current', HOUSEHOLD_STYLES[h].text) : 'border-slate-200 dark:border-slate-700',
                )}
              >
                <input type="radio" name="target" value={h} checked={target === h} onChange={() => setTarget(h)} className="sr-only" />
                <span className="flex items-center gap-2 font-semibold">
                  <span className={cn('h-3 w-3 rounded-full', HOUSEHOLD_STYLES[h].dot)} />
                  {HOUSEHOLD_STYLES[h].label}
                </span>
                <span className="text-xs text-slate-500">{atome.households[h].label}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="mb-2 text-sm font-medium">Enfants concernés</legend>
          <div className="flex flex-wrap gap-4">
            {protons.map((p) => (
              <Checkbox
                key={p.id}
                label={p.firstName}
                checked={protonIds.includes(p.id)}
                onChange={(e) => setProtonIds((ids) => (e.target.checked ? [...ids, p.id] : ids.filter((i) => i !== p.id)))}
              />
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="mb-2 text-sm font-medium">Jours ({dates.length})</legend>
          <ul className="flex flex-wrap gap-1.5">
            {dates.map((d) => (
              <li key={d} className="inline-flex items-center gap-1 rounded-full bg-slate-100 py-0.5 pl-2.5 pr-1 text-xs dark:bg-slate-800">
                {formatSwiss(d)}
                <button
                  type="button"
                  onClick={() => setDates((all) => all.filter((x) => x !== d))}
                  className="rounded-full p-0.5 hover:bg-slate-200 dark:hover:bg-slate-700"
                  aria-label={`Retirer le ${formatSwiss(d)}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </li>
            ))}
          </ul>
          <div className="mt-2 flex items-end gap-2">
            <Input label="Ajouter un jour" type="date" value={extraDate} onChange={(e) => setExtraDate(e.target.value)} wrapperClassName="flex-1" />
            <Button variant="secondary" onClick={addDate} icon={<Plus className="h-4 w-4" />} disabled={!extraDate}>
              Ajouter
            </Button>
          </div>
        </fieldset>

        <Textarea
          label="Commentaire (facultatif)"
          value={comment}
          maxLength={500}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Ex. : Camp de ski avec l'école, je peux les prendre du vendredi au dimanche."
        />
        {error && <Alert tone="error">{error}</Alert>}
      </form>
    </Modal>
  )
}
