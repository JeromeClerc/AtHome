import { useEffect, useState } from 'react'
import { Alert, Button, Modal, Textarea } from '@/components/ui'
import { toFrenchError } from '@/services/firestore.helpers'
import type { IsoDate } from '@/types'
import { formatDateRanges } from '@/utils/dates'

interface Props {
  open: boolean
  dates: IsoDate[]
  onClose: () => void
  onSubmit: (text: string) => Promise<void>
}

/** Ajout d'une note libre sur un ou plusieurs jours. */
export function NoteModal({ open, dates, onClose, onSubmit }: Props) {
  const [text, setText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setText('')
      setError(null)
    }
  }, [open])

  const save = async () => {
    setSaving(true)
    setError(null)
    try {
      await onSubmit(text)
      onClose()
    } catch (e) {
      setError(toFrenchError(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Ajouter une note"
      description={formatDateRanges(dates)}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Annuler
          </Button>
          <Button onClick={save} loading={saving} disabled={!text.trim()}>
            Enregistrer
          </Button>
        </>
      }
    >
      <Textarea
        label="Note"
        value={text}
        maxLength={1000}
        onChange={(e) => setText(e.target.value)}
        placeholder="Ex. : Rendez-vous chez le pédiatre à 16h30, carnet de vaccination dans le sac."
        hint={`${text.length}/1000 · visible par tous les membres de l'Atome`}
      />
      {error && (
        <Alert tone="error" className="mt-2">
          {error}
        </Alert>
      )}
    </Modal>
  )
}
