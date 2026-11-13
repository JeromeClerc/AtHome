import { describe, expect, it } from 'vitest'
import { canParentsEdit, computeAge, isAdult } from './age'

describe('règle de majorité', () => {
  it("calcule l'âge révolu", () => {
    expect(computeAge('2008-11-14', new Date(2026, 10, 13))).toBe(17)
    expect(computeAge('2008-11-13', new Date(2026, 10, 13))).toBe(18)
  })
  it('verrouille la fiche le jour des 18 ans', () => {
    expect(canParentsEdit('2008-11-14', new Date(2026, 10, 13))).toBe(true)
    expect(isAdult('2008-11-13', new Date(2026, 10, 13))).toBe(true)
    expect(canParentsEdit('2008-11-13', new Date(2026, 10, 13))).toBe(false)
  })
})
