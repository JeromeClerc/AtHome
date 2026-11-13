import { describe, expect, it } from 'vitest'
import { formatSwissPhone, normalizeSwissPhone, slugify } from './strings'

describe('strings', () => {
  it('slugify', () => {
    expect(slugify('  Famille Müller-Dupont ! ')).toBe('famille-muller-dupont')
  })
  it('numéros suisses', () => {
    expect(normalizeSwissPhone('079 123 45 67')).toBe('+41791234567')
    expect(normalizeSwissPhone('0041 79 123 45 67')).toBe('+41791234567')
    expect(normalizeSwissPhone('abc')).toBeNull()
    expect(formatSwissPhone('+41791234567')).toBe('+41 79 123 45 67')
  })
})
