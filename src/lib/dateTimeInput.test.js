import { describe, expect, test } from 'vitest'
import { fromDateTimeLocal, toDateTimeLocal } from './dateTimeInput'

describe('dateTimeInput', () => {
  test('ida e volta preserva o instante (até o minuto)', () => {
    const iso = new Date(2026, 8, 25, 14, 7).toISOString()
    const local = toDateTimeLocal(iso)
    expect(local).toBe('2026-09-25T14:07')
    expect(fromDateTimeLocal(local)).toBe(iso)
  })

  test('vazio/inválido', () => {
    expect(toDateTimeLocal(null)).toBe('')
    expect(toDateTimeLocal('xx')).toBe('')
    expect(fromDateTimeLocal('')).toBeNull()
    expect(fromDateTimeLocal('xx')).toBeNull()
  })
})
