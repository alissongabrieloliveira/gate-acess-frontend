import { describe, expect, it } from 'vitest'
import { checkRetroactive, dateTimeLocalToIso, retroactiveBounds, toDateTimeLocal } from './retroactive'

const now = new Date(2026, 9, 5, 15, 30) // 05/10/2026 15:30 (hora local)
const base = {
  start: '2026-10-05T08:00',
  reason: 'Esqueci de lançar',
  isAdmin: false,
  startLabel: 'Data de entrada',
  endLabel: 'Data de saída',
  now,
}

describe('lançamento retroativo', () => {
  it('converte datetime-local de/para ISO na hora local', () => {
    expect(toDateTimeLocal(now)).toBe('2026-10-05T15:30')
    expect(dateTimeLocalToIso('2026-10-05T15:30')).toBe(now.toISOString())
    expect(dateTimeLocalToIso('')).toBeNull()
  })

  it('operador tem limite de 7 dias; admin não', () => {
    expect(retroactiveBounds(false, now)).toEqual({ min: '2026-09-28T15:30', max: '2026-10-05T15:30' })
    expect(retroactiveBounds(true, now).min).toBeUndefined()
    expect(checkRetroactive({ ...base, start: '2026-09-20T08:00' })).toMatch(/7 dias/)
    expect(checkRetroactive({ ...base, start: '2026-09-20T08:00', isAdmin: true })).toBeNull()
  })

  it('aceita só a entrada, ou entrada + saída coerentes', () => {
    expect(checkRetroactive(base)).toBeNull()
    expect(checkRetroactive({ ...base, hasEnd: true, end: '2026-10-05T10:00' })).toBeNull()
    expect(checkRetroactive({ ...base, hasEnd: true, end: '2026-10-05T07:00' })).toMatch(/anterior/)
    expect(checkRetroactive({ ...base, hasEnd: true, end: '' })).toMatch(/Informe a data de saída/)
  })

  it('recusa futuro, data vazia e motivo curto', () => {
    expect(checkRetroactive({ ...base, start: '2026-10-05T16:00' })).toMatch(/futuro/)
    expect(checkRetroactive({ ...base, start: '' })).toMatch(/Informe a data de entrada/)
    expect(checkRetroactive({ ...base, reason: ' ok ' })).toMatch(/motivo/)
  })
})
