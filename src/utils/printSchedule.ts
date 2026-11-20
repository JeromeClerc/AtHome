import { eachMonthOfInterval, endOfMonth, endOfWeek, format, startOfMonth, startOfWeek } from 'date-fns'
import { fr } from 'date-fns/locale'
import { buildCalendarIndex } from '@/config/vaudCalendar'
import { HOUSEHOLD_STYLES } from '@/config/theme'
import type { Atome, Household, IsoDate, Proton, ScheduleMap } from '@/types'
import { eachIsoDate, formatSwiss, fromIsoDate, isIsoDate, isWeekend, toIsoDate } from './dates'
import { computeStats, percent } from './stats'

export type PrintPeriodMode = 'year' | 'month' | 'range'

export interface PrintScheduleConfig {
  mode: PrintPeriodMode
  startDate: IsoDate
  endDate: IsoDate
  periodTitle: string
  atome: Atome
  protons: Proton[]
  schedule: ScheduleMap
}

/**
 * Analyse une date saisie au format suisse `dd.mm.aaaa` (ex. `15.04.2026`) ou ISO `yyyy-MM-dd`
 * et retourne la date ISO `yyyy-MM-dd` correspondante, ou `null` si invalide.
 */
export function parseSwissOrIsoDate(value: string): IsoDate | null {
  const clean = value.trim()
  if (isIsoDate(clean)) return clean
  const match = /^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/.exec(clean)
  if (!match) return null
  const day = match[1]!.padStart(2, '0')
  const month = match[2]!.padStart(2, '0')
  const year = match[3]!
  const iso = `${year}-${month}-${day}`
  return isIsoDate(iso) ? iso : null
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function resolveDayHousehold(
  assignments: Record<string, Household> | undefined,
  protons: Proton[],
): { kind: 'electron' | 'positron' | 'mixed' | 'none'; details: Array<{ name: string; household: Household }> } {
  if (!assignments) return { kind: 'none', details: [] }
  const details: Array<{ name: string; household: Household }> = []
  if (protons.length > 0) {
    for (const p of protons) {
      const h = assignments[p.id]
      if (h) details.push({ name: p.firstName, household: h })
    }
  } else {
    for (const [id, h] of Object.entries(assignments)) {
      details.push({ name: id, household: h })
    }
  }
  if (details.length === 0) return { kind: 'none', details: [] }
  const first = details[0]!.household
  const same = details.every((d) => d.household === first)
  return { kind: same ? first : 'mixed', details }
}

/**
 * Construit le document HTML/CSS complet prêt pour l'impression ou l'enregistrement en PDF
 * dans un nouvel onglet :
 * - Mois entier : orientation Portrait (`@page { size: A4 portrait; }`).
 * - Année entière ou plage de dates : orientation Paysage (`@page { size: A4 landscape; }`).
 */
export function buildPrintableHtml(config: PrintScheduleConfig): string {
  const { mode, startDate, endDate, periodTitle, atome, protons, schedule } = config
  const orientation = mode === 'month' ? 'portrait' : 'landscape'
  const electronLabel = atome.households.electron.label || HOUSEHOLD_STYLES.electron.label
  const positronLabel = atome.households.positron.label || HOUSEHOLD_STYLES.positron.label

  const stats = computeStats(schedule, startDate, endDate)
  const peAll = percent(stats.all.electron, stats.all.total)
  const ppAll = stats.all.total ? 100 - peAll : 0
  const peSchool = percent(stats.schoolHolidays.electron, stats.schoolHolidays.total)
  const ppSchool = stats.schoolHolidays.total ? 100 - peSchool : 0

  const calStart = toIsoDate(startOfMonth(fromIsoDate(startDate)))
  const calEnd = toIsoDate(endOfMonth(fromIsoDate(endDate)))
  const calendarIndex = buildCalendarIndex(calStart, calEnd)

  let bodyHtml = ''

  if (mode === 'month') {
    const monthDate = fromIsoDate(startDate)
    const gridStart = startOfWeek(startOfMonth(monthDate), { weekStartsOn: 1 })
    const gridEnd = endOfWeek(endOfMonth(monthDate), { weekStartsOn: 1 })
    const allDates = eachIsoDate(toIsoDate(gridStart), toIsoDate(gridEnd))
    const weeks: IsoDate[][] = []
    for (let i = 0; i < allDates.length; i += 7) {
      weeks.push(allDates.slice(i, i + 7))
    }

    const rowsHtml = weeks
      .map((week) => {
        const cells = week
          .map((d) => {
            const inMonth = d >= startDate && d <= endDate
            const dayNum = Number(d.slice(8, 10))
            const info = calendarIndex.get(d)
            const wknd = isWeekend(d)
            const resolved = inMonth ? resolveDayHousehold(schedule[d], protons) : { kind: 'none' as const, details: [] }

            let bgClass = inMonth ? 'cell-none' : 'cell-outside'
            if (inMonth) {
              if (resolved.kind === 'electron') bgClass = wknd ? 'cell-electron-wknd' : 'cell-electron'
              else if (resolved.kind === 'positron') bgClass = wknd ? 'cell-positron-wknd' : 'cell-positron'
              else if (resolved.kind === 'mixed') bgClass = 'cell-mixed'
            }

            const householdText =
              resolved.kind === 'electron'
                ? escapeHtml(electronLabel)
                : resolved.kind === 'positron'
                  ? escapeHtml(positronLabel)
                  : resolved.kind === 'mixed'
                    ? resolved.details
                        .map((x) => `${escapeHtml(x.name)}: ${escapeHtml(x.household === 'electron' ? electronLabel : positronLabel)}`)
                        .join(' · ')
                    : ''

            return `<td class="month-cell ${bgClass}">
              <div class="cell-top">
                <span class="day-num ${info?.holiday && inMonth ? 'day-holiday' : ''}">${dayNum}</span>
                ${info?.holiday && inMonth ? `<span class="holiday-badge">⚑ ${escapeHtml(info.holiday.name)}</span>` : ''}
              </div>
              ${householdText ? `<div class="household-pill">${householdText}</div>` : ''}
              ${info?.schoolHoliday && inMonth ? `<div class="school-bar">${escapeHtml(info.schoolHoliday.name)}</div>` : ''}
            </td>`
          })
          .join('')
        return `<tr>${cells}</tr>`
      })
      .join('')

    bodyHtml = `
      <table class="month-table">
        <thead>
          <tr>
            <th>Lundi</th>
            <th>Mardi</th>
            <th>Mercredi</th>
            <th>Jeudi</th>
            <th>Vendredi</th>
            <th>Samedi</th>
            <th>Dimanche</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>
    `
  } else {
    const months = eachMonthOfInterval({ start: fromIsoDate(startDate), end: fromIsoDate(endDate) })
    const cols = months.length <= 3 ? months.length : months.length <= 6 ? 3 : 4
    const monthsHtml = months
      .map((m) => {
        const mStart = startOfMonth(m)
        const mEnd = endOfMonth(m)
        const mStartIso = toIsoDate(mStart)
        const mEndIso = toIsoDate(mEnd)
        const gStart = startOfWeek(mStart, { weekStartsOn: 1 })
        const gEnd = endOfWeek(mEnd, { weekStartsOn: 1 })
        const days = eachIsoDate(toIsoDate(gStart), toIsoDate(gEnd))
        const weeks: IsoDate[][] = []
        for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7))

        const rows = weeks
          .map((w) => {
            const tds = w
              .map((d) => {
                const inCurrentMonth = d >= mStartIso && d <= mEndIso
                const inRange = inCurrentMonth && d >= startDate && d <= endDate
                if (!inCurrentMonth) return `<td class="mini-td mini-outside"></td>`
                const dayNum = Number(d.slice(8, 10))
                const info = calendarIndex.get(d)
                const wknd = isWeekend(d)
                const resolved = inRange ? resolveDayHousehold(schedule[d], protons) : { kind: 'none' as const, details: [] }

                let cls = 'mini-td'
                if (!inRange) cls += ' mini-muted'
                else if (resolved.kind === 'electron') cls += wknd ? ' cell-electron-wknd' : ' cell-electron'
                else if (resolved.kind === 'positron') cls += wknd ? ' cell-positron-wknd' : ' cell-positron'
                else if (resolved.kind === 'mixed') cls += ' cell-mixed'

                if (info?.holiday && inRange) cls += ' mini-holiday'
                if (info?.schoolHoliday && inRange) cls += ' mini-school'

                return `<td class="${cls}">${dayNum}</td>`
              })
              .join('')
            return `<tr>${tds}</tr>`
          })
          .join('')

        const title = format(m, months.length > 12 ? 'MMMM yyyy' : 'MMMM', { locale: fr })
        return `<div class="mini-month">
          <div class="mini-month-title">${escapeHtml(title)}</div>
          <table class="mini-table">
            <thead>
              <tr><th>L</th><th>M</th><th>M</th><th>J</th><th>V</th><th>S</th><th>D</th></tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>`
      })
      .join('')

    bodyHtml = `<div class="year-grid" style="grid-template-columns: repeat(${cols}, minmax(0, 1fr));">${monthsHtml}</div>`
  }

  const childrenList = protons.length > 0 ? protons.map((p) => escapeHtml(p.firstName)).join(', ') : '—'

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <title>At Home — ${escapeHtml(atome.name)} — ${escapeHtml(periodTitle)}</title>
  <style>
    @page {
      size: A4 ${orientation};
      margin: ${mode === 'month' ? '10mm' : '8mm'};
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      margin: 0;
      padding: 12px 16px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #0f172a;
      background: #ffffff;
    }
    .no-print {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 14px;
      padding: 10px 14px;
      border-radius: 10px;
      background: #f1f5f9;
      border: 1px solid #cbd5e1;
      font-size: 13px;
    }
    .print-btn {
      cursor: pointer;
      background: #0284c7;
      color: #ffffff;
      border: none;
      border-radius: 8px;
      padding: 8px 14px;
      font-weight: 600;
      font-size: 13px;
    }
    .print-btn:hover {
      background: #0369a1;
    }
    @media print {
      body { padding: 0; }
      .no-print { display: none !important; }
    }
    .doc-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 12px;
      border-bottom: 2px solid #e2e8f0;
      padding-bottom: 8px;
      margin-bottom: 10px;
    }
    .doc-title {
      margin: 0;
      font-size: 18px;
      font-weight: 700;
      color: #0f172a;
    }
    .doc-subtitle {
      margin: 2px 0 0;
      font-size: 13px;
      color: #475569;
      font-weight: 500;
    }
    .stats-strip {
      font-size: 11px;
      color: #334155;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 6px 10px;
      line-height: 1.45;
      text-align: right;
    }
    .stat-e { color: #0369a1; font-weight: 600; }
    .stat-p { color: #b45309; font-weight: 600; }
    .cell-electron { background-color: #e0f2fe !important; color: #0c4a6e; }
    .cell-electron-wknd { background-color: #bae6fd !important; color: #0c4a6e; }
    .cell-positron { background-color: #fef3c7 !important; color: #78350f; }
    .cell-positron-wknd { background-color: #fde68a !important; color: #78350f; }
    .cell-mixed {
      background: linear-gradient(135deg, #bae6fd 50%, #fde68a 50%) !important;
      color: #0f172a;
    }
    .cell-none { background-color: #ffffff; }
    .cell-outside { background-color: #f8fafc; color: #cbd5e1; }

    /* Vue Mois (Portrait) */
    .month-table {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
    }
    .month-table th {
      background: #f1f5f9;
      border: 1px solid #cbd5e1;
      padding: 6px 4px;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: #475569;
    }
    .month-cell {
      border: 1px solid #cbd5e1;
      vertical-align: top;
      height: 36mm;
      padding: 5px 6px;
      position: relative;
    }
    .cell-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 4px;
    }
    .day-num {
      font-size: 13px;
      font-weight: 700;
    }
    .day-holiday {
      color: #dc2626 !important;
    }
    .holiday-badge {
      font-size: 9px;
      font-weight: 600;
      color: #991b1b;
      background: #fee2e2;
      border-radius: 4px;
      padding: 1px 4px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .household-pill {
      margin-top: 6px;
      font-size: 11px;
      font-weight: 600;
    }
    .school-bar {
      position: absolute;
      left: 3px;
      right: 3px;
      bottom: 3px;
      background: #ede9fe;
      color: #5b21b6;
      border-left: 3px solid #8b5cf6;
      font-size: 9px;
      font-weight: 600;
      padding: 1px 4px;
      border-radius: 3px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    /* Vue Année / Plage (Paysage) */
    .year-grid {
      display: grid;
      gap: 8px;
    }
    .mini-month {
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 5px 6px;
      break-inside: avoid;
    }
    .mini-month-title {
      font-size: 11px;
      font-weight: 700;
      text-transform: capitalize;
      text-align: center;
      margin-bottom: 3px;
      color: #0f172a;
    }
    .mini-table {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
    }
    .mini-table th {
      font-size: 8.5px;
      color: #64748b;
      padding: 1px 0;
      text-align: center;
    }
    .mini-td {
      font-size: 9.5px;
      text-align: center;
      padding: 2px 0;
      border: 1px solid #e2e8f0;
      font-weight: 600;
    }
    .mini-outside {
      border-color: transparent;
      background: transparent;
    }
    .mini-muted {
      color: #cbd5e1;
      background: #f8fafc;
    }
    .mini-holiday {
      color: #dc2626 !important;
      font-weight: 800;
      text-decoration: underline;
    }
    .mini-school {
      box-shadow: inset 0 -2.5px 0 #8b5cf6;
    }

    /* Légende de bas de page */
    .legend-footer {
      margin-top: 10px;
      padding-top: 8px;
      border-top: 1px solid #e2e8f0;
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      font-size: 10.5px;
      color: #475569;
    }
    .legend-items {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 14px;
    }
    .legend-item {
      display: inline-flex;
      align-items: center;
      gap: 5px;
    }
    .swatch {
      display: inline-block;
      width: 12px;
      height: 12px;
      border-radius: 3px;
      border: 1px solid rgba(15, 23, 42, 0.15);
    }
    .swatch-school {
      display: inline-block;
      width: 14px;
      height: 4px;
      background: #8b5cf6;
      border-radius: 2px;
    }
  </style>
</head>
<body>
  <div class="no-print">
    <div>
      <strong>Aperçu avant impression / export PDF</strong> — Orientation automatique :
      <strong>${orientation === 'portrait' ? 'Portrait (Mois)' : 'Paysage (Année / Période)'}</strong>.
      Choisissez <em>« Enregistrer au format PDF »</em> ou votre imprimante dans la boîte de dialogue.
    </div>
    <button type="button" class="print-btn" onclick="window.print()">Imprimer / Enregistrer en PDF</button>
  </div>

  <header class="doc-header">
    <div>
      <h1 class="doc-title">${escapeHtml(atome.name)}</h1>
      <p class="doc-subtitle">${escapeHtml(periodTitle)} · Enfants : ${childrenList}</p>
    </div>
    <div class="stats-strip">
      <div>
        <strong>Répartition des jours totaux (${stats.all.total} j) :</strong>
        <span class="stat-e">${escapeHtml(electronLabel)} ${stats.all.electron} j (${peAll}%)</span> ·
        <span class="stat-p">${escapeHtml(positronLabel)} ${stats.all.positron} j (${ppAll}%)</span>
      </div>
      <div>
        Vacances scolaires (${stats.schoolHolidays.total} j) :
        <span class="stat-e">${stats.schoolHolidays.electron} j (${peSchool}%)</span> /
        <span class="stat-p">${stats.schoolHolidays.positron} j (${ppSchool}%)</span> ·
        Fériés (${stats.publicHolidays.total} j) :
        <span class="stat-e">${stats.publicHolidays.electron} j</span> /
        <span class="stat-p">${stats.publicHolidays.positron} j</span> ·
        Week-ends (${stats.weekends.total} j) :
        <span class="stat-e">${stats.weekends.electron} j</span> /
        <span class="stat-p">${stats.weekends.positron} j</span>
      </div>
    </div>
  </header>

  <main>
    ${bodyHtml}
  </main>

  <footer class="legend-footer">
    <div class="legend-items">
      <strong>Légende :</strong>
      <span class="legend-item">
        <span class="swatch cell-electron-wknd"></span>
        <span><strong>${escapeHtml(electronLabel)}</strong> (Foyer 1)</span>
      </span>
      <span class="legend-item">
        <span class="swatch cell-positron-wknd"></span>
        <span><strong>${escapeHtml(positronLabel)}</strong> (Foyer 2)</span>
      </span>
      <span class="legend-item">
        <span style="color:#dc2626;font-weight:800;">⚑ Rouge</span>
        <span>Jour férié officiel (Canton de Vaud)</span>
      </span>
      <span class="legend-item">
        <span class="swatch-school"></span>
        <span>Vacances scolaires vaudoises</span>
      </span>
    </div>
    <div>Généré depuis At Home le ${formatSwiss(toIsoDate(new Date()))}</div>
  </footer>

  <script>
    window.addEventListener('load', function () {
      setTimeout(function () { window.print(); }, 250);
    });
  </script>
</body>
</html>`
}
