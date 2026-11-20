import { endOfYear, nextMonday } from 'date-fns'
import { Wand2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Alert, Button, Card, CardHeader, Checkbox, Input, Select } from '@/components/ui'
import { HOUSEHOLD_STYLES } from '@/config/theme'
import { useAtome } from '@/hooks/useAtome'
import { useScheduleActions } from '@/hooks/useSchedule'
import { toFrenchError } from '@/services/firestore.helpers'
import type { AlternancePattern, Household } from '@/types'
import { HOUSEHOLDS } from '@/types'
import { cn } from '@/utils/cn'
import { isoWeekday, toIsoDate } from '@/utils/dates'
import { buildCycle, generateSchedule, parseCustomCycle, PATTERN_LABELS } from '@/utils/scheduleGenerator'
import { computeStats, percent } from '@/utils/stats'

/**
 * Générateur du planning d'alternance. Crée les jours non planifiés et recalcule les jours
 * générés automatiquement (`lastChangeRequestId == null`), tout en préservant les jours modifiés
 * manuellement (échanges validés) ainsi que les demandes de modification en cours.
 */
export function ScheduleGenerator() {
  const { protons, atome } = useAtome()
  const { saveGenerated } = useScheduleActions()
  const defaultStart = toIsoDate(nextMonday(new Date()))
  const [startDate, setStartDate] = useState(defaultStart)
  const [endDate, setEndDate] = useState(toIsoDate(endOfYear(new Date(new Date().getFullYear() + 1, 0, 1))))
  const [pattern, setPattern] = useState<AlternancePattern>('weekly')
  const [first, setFirst] = useState<Household>('electron')
  const [custom, setCustom] = useState('E E E E E E E P P P P P P P')
  const [bridges, setBridges] = useState(true)
  const [holidayBlocks, setHolidayBlocks] = useState(true)
  const [evenYearHousehold, setEvenYearHousehold] = useState<Household>('electron')
  const [selected, setSelected] = useState<string[] | null>(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ tone: 'success' | 'error'; text: string } | null>(null)

  const protonIds = useMemo(() => selected ?? protons.map((p) => p.id), [selected, protons])

  const preview = useMemo(() => {
    try {
      if (protonIds.length === 0) return { error: 'Sélectionnez au moins un enfant.' }
      const customCycle = pattern === 'custom' ? parseCustomCycle(custom) : undefined
      const cycle = buildCycle(pattern, first, customCycle)
      const schedule = generateSchedule({
        startDate,
        endDate,
        pattern,
        firstHousehold: first,
        customCycle,
        protonIds,
        applyHolidayBridges: bridges,
        applyHolidayBlocks: holidayBlocks,
        evenYearHolidayHousehold: evenYearHousehold,
      })
      const stats = computeStats(schedule, startDate, endDate, protonIds[0])
      return { schedule, stats, cycle }
    } catch (e) {
      return { error: toFrenchError(e) }
    }
  }, [startDate, endDate, pattern, first, custom, bridges, holidayBlocks, evenYearHousehold, protonIds])

  const save = async () => {
    if (!('schedule' in preview) || !preview.schedule) return
    setSaving(true)
    setMessage(null)
    try {
      const r = await saveGenerated(preview.schedule)
      setMessage({
        tone: 'success',
        text: `Planning enregistré : ${r.created} jour(s) créé(s), ${r.updated} recalculé(s), ${r.completed} complété(s), ${r.preserved} échange(s) validé(s) préservé(s).`,
      })
    } catch (e) {
      setMessage({ tone: 'error', text: toFrenchError(e) })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader
        title="Générer le planning d'alternance"
        description="Recalcule le planning automatique tout en préservant les jours modifiés manuellement (échanges validés) ainsi que les demandes de modification en cours."
      />
      <div className="grid gap-4 p-5 sm:grid-cols-2">
        <Select label="Modèle d'alternance" value={pattern} onChange={(e) => setPattern(e.target.value as AlternancePattern)} hint={PATTERN_LABELS[pattern].description}>
          {(Object.keys(PATTERN_LABELS) as AlternancePattern[]).map((p) => (
            <option key={p} value={p}>
              {PATTERN_LABELS[p].label}
            </option>
          ))}
        </Select>
        <Select label="Foyer qui commence le cycle" value={first} onChange={(e) => setFirst(e.target.value as Household)}>
          {HOUSEHOLDS.map((h) => (
            <option key={h} value={h}>
              {HOUSEHOLD_STYLES[h].label} — {atome.households[h].label}
            </option>
          ))}
        </Select>
        <Input
          label="Début (inclus)"
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          hint={isoWeekday(startDate) !== 1 && pattern !== 'custom' ? 'Conseil : commencez un lundi.' : undefined}
        />
        <Input label="Fin (incluse)" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        {pattern === 'custom' && (
          <Input
            wrapperClassName="sm:col-span-2"
            label="Cycle personnalisé"
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            hint="Une lettre par jour, à partir de la date de début : E = Électron, P = Positron. Le cycle se répète."
          />
        )}
        <fieldset className="sm:col-span-2">
          <legend className="mb-2 text-sm font-medium">Enfants</legend>
          <div className="flex flex-wrap gap-4">
            {protons.map((p) => (
              <Checkbox
                key={p.id}
                label={p.firstName}
                checked={protonIds.includes(p.id)}
                onChange={(e) => setSelected(e.target.checked ? [...protonIds, p.id] : protonIds.filter((id) => id !== p.id))}
              />
            ))}
            {protons.length === 0 && <p className="text-sm text-slate-500">Ajoutez d'abord des enfants.</p>}
          </div>
        </fieldset>
        <Checkbox
          className="sm:col-span-2"
          label="Rattacher les jours fériés vaudois adjacents au week-end (Vendredi saint, lundis de Pâques, Pentecôte, Jeûne…) au parent du week-end"
          checked={bridges}
          onChange={(e) => setBridges(e.target.checked)}
        />
        <Checkbox
          className="sm:col-span-2"
          label="Alterner par blocs les fêtes de fin d'année (Noël / Nouvel An en 2 blocs sur les vacances d'hiver vaudoises) et Pâques selon les années paires / impaires"
          checked={holidayBlocks}
          onChange={(e) => setHolidayBlocks(e.target.checked)}
        />
        {holidayBlocks && (
          <Select
            wrapperClassName="sm:col-span-2"
            label="Attribution années paires (Parent A / Parent B)"
            value={evenYearHousehold}
            onChange={(e) => setEvenYearHousehold(e.target.value as Household)}
            hint="Années impaires : inversion automatique (Bloc 1 Noël & Pâques au Parent B, Bloc 2 Nouvel An au Parent A)."
          >
            <option value="electron">
              Années paires : Noël (Bloc 1) &amp; Pâques → {HOUSEHOLD_STYLES.electron.label} ({atome.households.electron.label}) · Nouvel An (Bloc 2) →{' '}
              {HOUSEHOLD_STYLES.positron.label} ({atome.households.positron.label})
            </option>
            <option value="positron">
              Années paires : Noël (Bloc 1) &amp; Pâques → {HOUSEHOLD_STYLES.positron.label} ({atome.households.positron.label}) · Nouvel An (Bloc 2) →{' '}
              {HOUSEHOLD_STYLES.electron.label} ({atome.households.electron.label})
            </option>
          </Select>
        )}
      </div>

      <div className="border-t border-slate-200 p-5 dark:border-slate-800">
        {'error' in preview ? (
          <Alert tone="error">{preview.error}</Alert>
        ) : (
          <div className="space-y-3">
            <div>
              <p className="mb-1 text-xs font-medium text-slate-500">Aperçu du cycle ({preview.cycle.length} jours)</p>
              <div className="flex flex-wrap gap-0.5">
                {preview.cycle.map((h, i) => (
                  <span key={i} className={cn('flex h-6 w-6 items-center justify-center rounded text-[10px] font-bold', HOUSEHOLD_STYLES[h].solid)}>
                    {HOUSEHOLD_STYLES[h].short}
                  </span>
                ))}
              </div>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Sur la période ({preview.stats.all.total} jours par enfant) :{' '}
              <span className={HOUSEHOLD_STYLES.electron.text}>
                Électron {preview.stats.all.electron} j ({percent(preview.stats.all.electron, preview.stats.all.total)}%)
              </span>{' '}
              ·{' '}
              <span className={HOUSEHOLD_STYLES.positron.text}>
                Positron {preview.stats.all.positron} j ({percent(preview.stats.all.positron, preview.stats.all.total)}%)
              </span>
            </p>
          </div>
        )}
        {message && (
          <Alert tone={message.tone} className="mt-3">
            {message.text}
          </Alert>
        )}
        <div className="mt-4 flex justify-end">
          <Button icon={<Wand2 className="h-4 w-4" />} onClick={save} loading={saving} disabled={'error' in preview}>
            Générer et enregistrer
          </Button>
        </div>
      </div>
    </Card>
  )
}
