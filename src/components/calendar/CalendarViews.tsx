import type { MouseEvent } from 'react'
import type { DayCalendarInfo } from '@/config/vaudCalendar'
import type { ChangeRequest, DayNote, IsoDate, Proton, ScheduleMap } from '@/types'
import { chunkWeeks, WEEKDAY_LETTER, WEEKDAY_SHORT } from '@/utils/calendarNavigation'
import { cn } from '@/utils/cn'
import { eachIsoDate, formatFr, fromIsoDate, toIsoDate } from '@/utils/dates'
import { DayCell } from './DayCell'

/** Données communes aux vues du calendrier. */
export interface CalendarViewProps {
  start: IsoDate
  end: IsoDate
  anchor: IsoDate
  today: IsoDate
  schedule: ScheduleMap
  calendarIndex: Map<IsoDate, DayCalendarInfo>
  pendingByDate: Map<IsoDate, ChangeRequest[]>
  notesByDate: Map<IsoDate, DayNote[]>
  protons: Proton[]
  protonId: string | null
  selected: Set<IsoDate>
  focused: IsoDate | null
  onDayClick: (date: IsoDate, e: MouseEvent) => void
}

function cellProps(p: CalendarViewProps, date: IsoDate) {
  return {
    date,
    info: p.calendarIndex.get(date),
    assignments: p.schedule[date],
    pending: p.pendingByDate.get(date),
    notes: p.notesByDate.get(date),
    protons: p.protons,
    protonId: p.protonId,
    selected: p.selected.has(date),
    focused: p.focused === date,
    isToday: p.today === date,
    onClick: p.onDayClick,
  }
}

function WeekdayHeader({ letters = false }: { letters?: boolean }) {
  const labels = letters ? WEEKDAY_LETTER : WEEKDAY_SHORT
  return (
    <div className="grid grid-cols-7 gap-1" aria-hidden>
      {labels.map((d, i) => (
        <div
          key={`${d}-${i}`}
          className={cn(
            'text-center font-medium text-slate-500',
            letters ? 'text-[9px]' : 'py-1 text-xs',
            i >= 5 && 'font-bold text-slate-700 dark:text-slate-300',
          )}
        >
          {d}
        </div>
      ))}
    </div>
  )
}

export function WeekView(props: CalendarViewProps) {
  const days = eachIsoDate(props.start, props.end)
  return (
    <div className="space-y-1">
      <div className="hidden sm:block">
        <WeekdayHeader />
      </div>
      {/* Une colonne par jour sur desktop ; liste verticale sur mobile. */}
      <div className="grid grid-cols-1 gap-1 sm:grid-cols-7">
        {days.map((d) => (
          <DayCell key={d} {...cellProps(props, d)} variant="week" />
        ))}
      </div>
    </div>
  )
}

export function MonthView(props: CalendarViewProps) {
  const month = fromIsoDate(props.anchor).getMonth()
  const weeks = chunkWeeks(eachIsoDate(props.start, props.end))
  return (
    <div className="space-y-1">
      <WeekdayHeader />
      {weeks.map((w) => (
        <div key={w[0]} className="grid grid-cols-7 gap-1">
          {w.map((d) => (
            <DayCell key={d} {...cellProps(props, d)} variant="month" outside={fromIsoDate(d).getMonth() !== month} />
          ))}
        </div>
      ))}
    </div>
  )
}

export function YearView(props: CalendarViewProps) {
  const year = fromIsoDate(props.anchor).getFullYear()
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: 12 }, (_, m) => {
        const first = new Date(year, m, 1)
        const offset = (first.getDay() + 6) % 7
        const days = eachIsoDate(toIsoDate(first), toIsoDate(new Date(year, m + 1, 0)))
        return (
          <section key={m} aria-label={formatFr(first, 'MMMM yyyy')}>
            <h3 className="mb-1 text-sm font-semibold capitalize">{formatFr(first, 'MMMM')}</h3>
            <WeekdayHeader letters />
            <div className="mt-0.5 grid grid-cols-7 gap-[2px]">
              {Array.from({ length: offset }, (_, i) => (
                <span key={`e${i}`} />
              ))}
              {days.map((d) => (
                <DayCell key={d} {...cellProps(props, d)} variant="mini" />
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}
