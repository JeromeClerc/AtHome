import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { buildCalendarIndex } from '@/config/vaudCalendar'
import type { ChangeRequest, DayNote, Proton } from '@/types'
import { DayCell } from './DayCell'

const protons: Proton[] = [
  { id: 'a', firstName: 'Léa', lastName: 'Rochat', birthDate: '2015-03-01', gender: 'female', majorityAt: null, colorIndex: 0, createdAt: null, updatedAt: null },
  { id: 'b', firstName: 'Noé', lastName: 'Rochat', birthDate: '2018-06-12', gender: 'male', majorityAt: null, colorIndex: 1, createdAt: null, updatedAt: null },
]

const index = buildCalendarIndex('2026-04-03', '2026-04-06')

const pending = {
  id: 'r1',
  dates: ['2026-04-06'],
  protonIds: ['a'],
  targetHousehold: 'positron',
  status: 'pending',
} as ChangeRequest

const note: DayNote = {
  id: 'n1',
  date: '2026-04-06',
  text: 'Chasse aux œufs',
  authorUid: 'u1',
  authorRole: 'positron',
  authorName: 'Camille',
  createdAt: null,
}

describe('<DayCell />', () => {
  it('affiche le jour férié vaudois et les attributions en vue semaine', () => {
    render(
      <DayCell
        date="2026-04-03"
        info={index.get('2026-04-03')}
        assignments={{ a: 'electron', b: 'positron' }}
        pending={undefined}
        notes={undefined}
        protons={protons}
        protonId={null}
        selected={false}
        focused={false}
        isToday={false}
        variant="week"
        onClick={() => undefined}
      />,
    )
    expect(screen.getByText('Vendredi saint')).toBeInTheDocument()
    expect(screen.getByText(/Léa · Électron/)).toBeInTheDocument()
    expect(screen.getByText(/Noé · Positron/)).toBeInTheDocument()
  })

  it('signale une modification en attente et une note, et gère le clic', async () => {
    const onClick = vi.fn()
    render(
      <DayCell
        date="2026-04-06"
        info={index.get('2026-04-06')}
        assignments={{ a: 'electron', b: 'electron' }}
        pending={[pending]}
        notes={[note]}
        protons={protons}
        protonId={null}
        selected
        focused={false}
        isToday={false}
        variant="month"
        onClick={onClick}
      />,
    )
    const button = screen.getByRole('button')
    expect(button).toHaveAttribute('aria-pressed', 'true')
    expect(button.getAttribute('aria-label')).toMatch(/en attente de validation/)
    expect(button.getAttribute('aria-label')).toMatch(/1 note/)
    expect(button.getAttribute('aria-label')).toMatch(/Lundi de Pâques/)
    await userEvent.click(button)
    expect(onClick).toHaveBeenCalledWith('2026-04-06', expect.anything())
  })

  it("masque l'attente si l'enfant filtré n'est pas concerné", () => {
    render(
      <DayCell
        date="2026-04-06"
        info={index.get('2026-04-06')}
        assignments={{ a: 'electron', b: 'electron' }}
        pending={[pending]}
        notes={undefined}
        protons={protons}
        protonId="b"
        selected={false}
        focused={false}
        isToday={false}
        variant="month"
        onClick={() => undefined}
      />,
    )
    expect(screen.getByRole('button').getAttribute('aria-label')).not.toMatch(/en attente/)
  })
})
