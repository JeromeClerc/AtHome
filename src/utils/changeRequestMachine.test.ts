import { describe, expect, it } from 'vitest'
import { canPerform, transition } from './changeRequestMachine'

describe('machine à états des demandes', () => {
  const pending = { status: 'pending' as const, awaitingHousehold: 'positron' as const }

  it("seul l'autre parent peut approuver", () => {
    expect(canPerform(pending, 'approve', 'positron')).toBe(true)
    expect(canPerform(pending, 'approve', 'electron')).toBe(false)
  })

  it('le proposant peut annuler sa demande', () => {
    expect(canPerform(pending, 'cancel', 'electron')).toBe(true)
    expect(canPerform(pending, 'cancel', 'positron')).toBe(false)
  })

  it('contre-proposition : la balle change de camp (ping-pong)', () => {
    const next = transition(pending, 'counter_propose', 'positron')
    expect(next).toEqual({ status: 'counter_proposed', awaitingHousehold: 'electron' })
    const again = transition(next, 'counter_propose', 'electron')
    expect(again).toEqual({ status: 'counter_proposed', awaitingHousehold: 'positron' })
  })

  it('le rejet exige un motif', () => {
    expect(() => transition(pending, 'reject', 'positron', '  ')).toThrow(/motif/)
    expect(transition(pending, 'reject', 'positron', 'Je travaille')).toEqual({
      status: 'rejected',
      awaitingHousehold: 'electron',
    })
  })

  it('après rejet, le demandeur révise ou annule', () => {
    const rejected = { status: 'rejected' as const, awaitingHousehold: 'electron' as const }
    expect(transition(rejected, 'revise', 'electron')).toEqual({ status: 'pending', awaitingHousehold: 'positron' })
    expect(canPerform(rejected, 'approve', 'electron')).toBe(false)
    expect(canPerform(rejected, 'cancel', 'electron')).toBe(true)
  })

  it('une demande approuvée est définitive', () => {
    const approved = { status: 'approved' as const, awaitingHousehold: 'positron' as const }
    expect(() => transition(approved, 'cancel', 'electron')).toThrow()
  })
})
