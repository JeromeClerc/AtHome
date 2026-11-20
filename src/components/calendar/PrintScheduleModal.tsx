import { endOfMonth, format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Printer } from 'lucide-react'
import { useState } from 'react'
import { Alert, Button, Input, Modal, Select } from '@/components/ui'
import { useAtome } from '@/hooks/useAtome'
import { toFrenchError } from '@/services/firestore.helpers'
import { fetchScheduleRange } from '@/services/schedule.service'
import type { IsoDate } from '@/types'
import { cn } from '@/utils/cn'
import { formatSwiss, fromIsoDate, toIsoDate } from '@/utils/dates'
import { buildPrintableHtml, parseSwissOrIsoDate, type PrintPeriodMode } from '@/utils/printSchedule'

const MONTHS_FR = [
  'Janvier',
  'Février',
  'Mars',
  'Avril',
  'Mai',
  'Juin',
  'Juillet',
  'Août',
  'Septembre',
  'Octobre',
  'Novembre',
  'Décembre',
] as const

interface Props {
  open: boolean
  onClose: () => void
}

/**
 * Modale d'impression / génération PDF du planning :
 * - Une année entière (orientation paysage)
 * - Un mois entier (orientation portrait)
 * - Une plage de dates dd.mm.aaaa à dd.mm.aaaa (orientation paysage)
 */
export function PrintScheduleModal({ open, onClose }: Props) {
  const { atome, protons } = useAtome()
  const nowYear = Number(toIsoDate(new Date()).slice(0, 4))
  const nowMonth = Number(toIsoDate(new Date()).slice(5, 7))

  const [mode, setMode] = useState<PrintPeriodMode>('year')
  const [year, setYear] = useState(String(nowYear))
  const [month, setMonth] = useState(String(nowMonth))
  const [rangeStart, setRangeStart] = useState(`01.01.${nowYear}`)
  const [rangeEnd, setRangeEnd] = useState(`31.12.${nowYear}`)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const resolveSelection = (): { startDate: IsoDate; endDate: IsoDate; periodTitle: string } => {
    if (mode === 'year') {
      const y = Number(year)
      if (!Number.isInteger(y) || y < 2000 || y > 2100) throw new Error('Veuillez saisir une année valide (ex. 2026).')
      return {
        startDate: `${y}-01-01`,
        endDate: `${y}-12-31`,
        periodTitle: `Année ${y}`,
      }
    }
    if (mode === 'month') {
      const y = Number(year)
      const m = Number(month)
      if (!Number.isInteger(y) || y < 2000 || y > 2100) throw new Error('Veuillez saisir une année valide.')
      const startIso = `${y}-${String(m).padStart(2, '0')}-01`
      const endIso = toIsoDate(endOfMonth(fromIsoDate(startIso)))
      const title = format(fromIsoDate(startIso), 'MMMM yyyy', { locale: fr })
      return {
        startDate: startIso,
        endDate: endIso,
        periodTitle: title.charAt(0).toUpperCase() + title.slice(1),
      }
    }
    const startIso = parseSwissOrIsoDate(rangeStart)
    const endIso = parseSwissOrIsoDate(rangeEnd)
    if (!startIso || !endIso) {
      throw new Error('Veuillez saisir des dates au format JJ.MM.AAAA (ex. 01.06.2026 à 31.08.2026).')
    }
    if (endIso < startIso) {
      throw new Error('La date de fin doit être postérieure ou égale à la date de début.')
    }
    return {
      startDate: startIso,
      endDate: endIso,
      periodTitle: `Période du ${formatSwiss(startIso)} au ${formatSwiss(endIso)}`,
    }
  }

  const handlePrint = async () => {
    setError(null)
    let resolved: { startDate: IsoDate; endDate: IsoDate; periodTitle: string }
    try {
      resolved = resolveSelection()
    } catch (e) {
      setError(toFrenchError(e))
      return
    }

    // Ouvre le nouvel onglet de manière synchrone au clic pour éviter le blocage de pop-up.
    const printWindow = window.open('', '_blank')
    if (!printWindow) {
      setError('Veuillez autoriser l’ouverture d’un nouvel onglet dans votre navigateur pour afficher le PDF.')
      return
    }

    setBusy(true)
    try {
      const schedule = await fetchScheduleRange(atome.id, resolved.startDate, resolved.endDate)
      const html = buildPrintableHtml({
        mode,
        startDate: resolved.startDate,
        endDate: resolved.endDate,
        periodTitle: resolved.periodTitle,
        atome,
        protons,
        schedule,
      })
      printWindow.document.open()
      printWindow.document.write(html)
      printWindow.document.close()
      onClose()
    } catch (e) {
      printWindow.close()
      setError(toFrenchError(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Imprimer / Exporter le planning en PDF"
      description="Génère un document prêt à imprimer ou à télécharger en PDF dans un nouvel onglet (avec nom de l'Atome, statistiques de répartition et légende)."
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            Annuler
          </Button>
          <Button icon={<Printer className="h-4 w-4" />} loading={busy} onClick={() => void handlePrint()}>
            Imprimer / Générer le PDF
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <fieldset>
          <legend className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">Période à imprimer</legend>
          <div className="grid gap-2 sm:grid-cols-3">
            {[
              { id: 'year' as const, label: 'Une année entière', sub: 'Format Paysage' },
              { id: 'month' as const, label: 'Un mois entier', sub: 'Format Portrait' },
              { id: 'range' as const, label: 'Plage de dates', sub: 'Format Paysage' },
            ].map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => {
                  setMode(opt.id)
                  setError(null)
                }}
                className={cn(
                  'cursor-pointer rounded-xl border p-3 text-left transition-colors',
                  mode === opt.id
                    ? 'border-brand-600 bg-brand-50/70 text-brand-900 dark:border-brand-500 dark:bg-brand-950/40 dark:text-brand-100'
                    : 'border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/60',
                )}
              >
                <div className="text-sm font-semibold">{opt.label}</div>
                <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{opt.sub}</div>
              </button>
            ))}
          </div>
        </fieldset>

        {mode === 'year' && (
          <Input
            label="Année"
            type="number"
            min={2020}
            max={2100}
            value={year}
            onChange={(e) => setYear(e.target.value)}
            hint="Affiche les 12 mois de l'année sur une page A4 en orientation paysage."
          />
        )}

        {mode === 'month' && (
          <div className="grid gap-3 sm:grid-cols-2">
            <Select label="Mois" value={month} onChange={(e) => setMonth(e.target.value)}>
              {MONTHS_FR.map((label, idx) => (
                <option key={label} value={String(idx + 1)}>
                  {label}
                </option>
              ))}
            </Select>
            <Input label="Année" type="number" min={2020} max={2100} value={year} onChange={(e) => setYear(e.target.value)} />
          </div>
        )}

        {mode === 'range' && (
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label="Du (JJ.MM.AAAA)"
              placeholder="01.06.2026"
              value={rangeStart}
              onChange={(e) => setRangeStart(e.target.value)}
              hint="Format suisse dd.mm.aaaa"
            />
            <Input
              label="Au (JJ.MM.AAAA)"
              placeholder="31.08.2026"
              value={rangeEnd}
              onChange={(e) => setRangeEnd(e.target.value)}
              hint="Format suisse dd.mm.aaaa"
            />
          </div>
        )}

        {error && <Alert tone="error">{error}</Alert>}
      </div>
    </Modal>
  )
}
