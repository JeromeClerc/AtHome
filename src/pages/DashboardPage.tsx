import { CalendarPlus, Eye, MessageSquarePlus, Wand2, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState, type MouseEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { CalendarToolbar } from '@/components/calendar/CalendarToolbar'
import { MonthView, WeekView, YearView, type CalendarViewProps } from '@/components/calendar/CalendarViews'
import { ChangeRequestModal } from '@/components/calendar/ChangeRequestModal'
import { DayDetailPanel } from '@/components/calendar/DayDetailPanel'
import { Legend } from '@/components/calendar/Legend'
import { NoteModal } from '@/components/calendar/NoteModal'
import { RequestCard } from '@/components/calendar/RequestCard'
import { StatsBar } from '@/components/calendar/StatsBar'
import { Alert, Button, Card, Spinner } from '@/components/ui'
import { buildCalendarIndex } from '@/config/vaudCalendar'
import { useAtome } from '@/hooks/useAtome'
import { useSchedule, useScheduleActions } from '@/hooks/useSchedule'
import type { IsoDate, NavigationStep } from '@/types'
import { shiftAnchor, todayIso, visibleRange, type CalendarViewMode } from '@/utils/calendarNavigation'
import { cn } from '@/utils/cn'
import { eachIsoDate, formatDateRanges, isIsoDate } from '@/utils/dates'

const VIEW_MODES: CalendarViewMode[] = ['day', 'week', 'month', 'year']

/**
 * Tableau de bord : statistiques compactes + planning interactif (vues jour/semaine/mois/année).
 * Sélection multiple de jours (clic, Maj+clic pour une plage) → demande de modification ou note.
 * Paramètres d'URL : `view`, `date` (ancre), `request` (demande mise en évidence).
 */
export function DashboardPage() {
  const { atome, protons, isParent, household, role } = useAtome()
  const actions = useScheduleActions()
  const [params, setParams] = useSearchParams()
  const today = todayIso()

  const paramView = params.get('view') as CalendarViewMode | null
  const view: CalendarViewMode = paramView && VIEW_MODES.includes(paramView) ? paramView : 'month'
  const paramDate = params.get('date')
  const anchor: IsoDate = paramDate && isIsoDate(paramDate) ? paramDate : today
  const highlightedRequestId = params.get('request')

  const [selected, setSelected] = useState<Set<IsoDate>>(new Set())
  const [focused, setFocused] = useState<IsoDate | null>(paramDate && isIsoDate(paramDate) ? paramDate : today)
  const [protonFilter, setProtonFilter] = useState<string | null>(null)
  const [modal, setModal] = useState<'change' | 'note' | null>(null)
  const [noteDates, setNoteDates] = useState<IsoDate[]>([])

  // Une notification peut pointer vers une autre date : on recentre le focus.
  useEffect(() => {
    if (paramDate && isIsoDate(paramDate)) setFocused(paramDate)
  }, [paramDate])

  const updateParams = useCallback(
    (patch: Record<string, string | null>) => {
      const next = new URLSearchParams(params)
      for (const [k, v] of Object.entries(patch)) {
        if (v === null) next.delete(k)
        else next.set(k, v)
      }
      setParams(next, { replace: true })
    },
    [params, setParams],
  )

  const { start, end } = visibleRange(view, anchor)
  const data = useSchedule(start, end)
  const calendarIndex = useMemo(() => buildCalendarIndex(start, end), [start, end])

  const onDayClick = (date: IsoDate, e: MouseEvent) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (e.shiftKey && focused) {
        const [a, b] = focused < date ? [focused, date] : [date, focused]
        eachIsoDate(a, b).forEach((d) => next.add(d))
      } else if (next.has(date)) next.delete(date)
      else next.add(date)
      return next
    })
    setFocused(date)
  }

  const shift = (step: NavigationStep, dir: 1 | -1) => {
    const next = shiftAnchor(anchor, step, dir)
    updateParams({ date: next, request: null })
    setFocused(next)
  }

  const selectedDates = useMemo(() => [...selected].sort(), [selected])
  const focusDate = view === 'day' ? anchor : focused
  const focusRequests = useMemo(
    () => (focusDate ? data.requests.filter((r) => r.dates.includes(focusDate)) : []),
    [data.requests, focusDate],
  )
  const myTurn = data.requests.filter((r) => household && r.awaitingHousehold === household)
  const others = data.requests.filter((r) => !household || r.awaitingHousehold !== household)

  const viewProps: CalendarViewProps = {
    start,
    end,
    anchor,
    today,
    schedule: data.schedule,
    calendarIndex,
    pendingByDate: data.pendingByDate,
    notesByDate: data.notesByDate,
    protons,
    protonId: protonFilter,
    selected,
    focused,
    onDayClick,
  }

  const openNote = (dates: IsoDate[]) => {
    setNoteDates(dates)
    setModal('note')
  }

  const hasSchedule = Object.keys(data.schedule).length > 0

  return (
    <div className="space-y-5">
      <StatsBar initialYear={Number(anchor.slice(0, 4))} />

      {role === 'neutron' && (
        <Alert tone="info">
          <Eye className="mr-1 inline h-4 w-4" /> Accès Neutron : consultation du planning et des statistiques en lecture seule.
        </Alert>
      )}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <Card className="space-y-4 p-4 sm:p-5">
          <CalendarToolbar
            view={view}
            anchor={anchor}
            onViewChange={(v) => updateParams({ view: v })}
            onShift={shift}
            onToday={() => {
              updateParams({ date: null, request: null })
              setFocused(today)
            }}
          />

          {protons.length > 1 && (
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="text-slate-500">Afficher :</span>
              {[{ id: null, label: 'Tous' }, ...protons.map((p) => ({ id: p.id, label: p.firstName }))].map((opt) => (
                <button
                  key={opt.id ?? 'all'}
                  type="button"
                  onClick={() => setProtonFilter(opt.id)}
                  className={cn(
                    'rounded-full border px-3 py-0.5',
                    protonFilter === opt.id
                      ? 'border-brand-600 bg-brand-600 text-white'
                      : 'border-slate-300 hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800',
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}

          {data.error && <Alert tone="error">{data.error}</Alert>}
          {data.loading ? (
            <Spinner />
          ) : (
            <>
              {!hasSchedule && view !== 'day' && (
                <Alert tone="info">
                  Aucun jour planifié sur cette période.{' '}
                  {isParent && (
                    <Link to={`/${atome.slug}/foyer`} className="inline-flex items-center gap-1 font-medium underline">
                      <Wand2 className="h-3.5 w-3.5" /> Générer le planning
                    </Link>
                  )}
                </Alert>
              )}
              {view === 'week' && <WeekView {...viewProps} />}
              {view === 'month' && <MonthView {...viewProps} />}
              {view === 'year' && <YearView {...viewProps} />}
              {view === 'day' && (
                <DayDetailPanel
                  date={anchor}
                  info={calendarIndex.get(anchor)}
                  assignments={data.schedule[anchor]}
                  notes={data.notesByDate.get(anchor) ?? []}
                  requests={focusRequests}
                  highlightedRequestId={highlightedRequestId}
                  onAddNote={() => openNote([anchor])}
                  onDeleteNote={(id) => void actions.removeNote(id)}
                />
              )}
            </>
          )}

          <details className="group">
            <summary className="cursor-pointer select-none text-sm font-medium text-slate-600 dark:text-slate-400">Légende</summary>
            <Legend className="mt-3" />
          </details>
          {view !== 'day' && <p className="text-xs text-slate-500">Astuce : cliquez sur des jours pour les sélectionner, Maj + clic pour une plage.</p>}
        </Card>

        <aside className="space-y-4">
          {view !== 'day' && focusDate && (
            <DayDetailPanel
              date={focusDate}
              info={buildCalendarIndex(focusDate, focusDate).get(focusDate)}
              assignments={data.schedule[focusDate]}
              notes={data.notesByDate.get(focusDate) ?? []}
              requests={focusRequests}
              highlightedRequestId={highlightedRequestId}
              onAddNote={() => openNote([focusDate])}
              onDeleteNote={(id) => void actions.removeNote(id)}
            />
          )}

          <Card className="p-4">
            <h2 className="text-base font-semibold">Demandes en cours</h2>
            {data.requests.length === 0 ? (
              <p className="mt-2 text-sm text-slate-500">Aucune demande en attente.</p>
            ) : (
              <div className="mt-3 space-y-3">
                {myTurn.length > 0 && <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">À traiter ({myTurn.length})</p>}
                {myTurn.map((r) => (
                  <RequestCard key={r.id} request={r} highlighted={r.id === highlightedRequestId} />
                ))}
                {others.length > 0 && (
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">En attente de l'autre parent ({others.length})</p>
                )}
                {others.map((r) => (
                  <RequestCard key={r.id} request={r} highlighted={r.id === highlightedRequestId} />
                ))}
              </div>
            )}
          </Card>
        </aside>
      </div>

      {/* Barre d'actions de la sélection */}
      {selected.size > 0 && role !== 'neutron' && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 p-3 shadow-2xl backdrop-blur sm:bottom-4 sm:left-1/2 sm:right-auto sm:w-auto sm:-translate-x-1/2 sm:rounded-2xl sm:border dark:border-slate-800 dark:bg-slate-900/95">
          <div className="flex flex-wrap items-center gap-2">
            <span className="mr-1 text-sm">
              <strong>{selected.size}</strong> jour(s) · <span className="text-slate-500">{formatDateRanges(selectedDates)}</span>
            </span>
            {isParent && (
              <Button size="sm" icon={<CalendarPlus className="h-4 w-4" />} onClick={() => setModal('change')}>
                Attribuer…
              </Button>
            )}
            <Button size="sm" variant="secondary" icon={<MessageSquarePlus className="h-4 w-4" />} onClick={() => openNote(selectedDates)}>
              Note
            </Button>
            <Button size="sm" variant="ghost" icon={<X className="h-4 w-4" />} onClick={() => setSelected(new Set())}>
              Effacer
            </Button>
          </div>
        </div>
      )}

      {modal === 'change' && household && (
        <ChangeRequestModal
          open
          mode="propose"
          initial={{ dates: selectedDates, protonIds: protonFilter ? [protonFilter] : protons.map((p) => p.id), targetHousehold: household }}
          onClose={() => setModal(null)}
          onSubmit={async (draft) => {
            await actions.propose(draft)
            setSelected(new Set())
          }}
        />
      )}
      <NoteModal
        open={modal === 'note'}
        dates={noteDates}
        onClose={() => setModal(null)}
        onSubmit={async (text) => {
          await actions.addNote(noteDates, text)
          setSelected(new Set())
        }}
      />
    </div>
  )
}
