import { describe, expect, it } from 'vitest'
import { MAX_TRIP_KM, checkDepartureKm, checkReturnKm, parseKm } from './kmRules'

describe('parseKm', () => {
  it('aceita inteiros não-negativos e rejeita o resto', () => {
    expect(parseKm('152340')).toBe(152340)
    expect(parseKm(' 0 ')).toBe(0)
    expect(parseKm('')).toBeNull()
    expect(parseKm('12.5')).toBeNull()
    expect(parseKm('-3')).toBeNull()
    expect(parseKm('abc')).toBeNull()
  })
})

describe('checkDepartureKm', () => {
  it('exige o KM, a não ser que esteja indisponível', () => {
    expect(checkDepartureKm({ raw: '', unavailable: false, lastKm: null }).error).toMatch(/Informe o KM de saída/)
    expect(checkDepartureKm({ raw: '', unavailable: true, lastKm: 500 })).toEqual({ error: null, warning: null })
  })

  it('avisa (sem bloquear) quando é menor que o último KM conhecido', () => {
    const result = checkDepartureKm({ raw: '1000', unavailable: false, lastKm: 152340 })
    expect(result.error).toBeNull()
    expect(result.warning).toMatch(/menor que o último KM registrado/)
  })

  it('aceita igual ou maior que o último KM, e qualquer valor sem histórico', () => {
    expect(checkDepartureKm({ raw: '152340', unavailable: false, lastKm: 152340 }).warning).toBeNull()
    expect(checkDepartureKm({ raw: '200000', unavailable: false, lastKm: 152340 }).warning).toBeNull()
    expect(checkDepartureKm({ raw: '10', unavailable: false, lastKm: null }).warning).toBeNull()
  })
})

describe('checkReturnKm', () => {
  it('exige o KM, a não ser que esteja indisponível', () => {
    expect(checkReturnKm({ raw: '', unavailable: false, kmDeparture: 100 }).error).toMatch(/Informe o KM de retorno/)
    expect(checkReturnKm({ raw: '', unavailable: true, kmDeparture: 100 }).error).toBeNull()
  })

  it('bloqueia retorno menor ou IGUAL à saída', () => {
    expect(checkReturnKm({ raw: '99', unavailable: false, kmDeparture: 100 }).error).toMatch(/maior que o KM de saída/)
    expect(checkReturnKm({ raw: '100', unavailable: false, kmDeparture: 100 }).error).toMatch(/maior que o KM de saída/)
  })

  it('calcula o percorrido quando válido', () => {
    const result = checkReturnKm({ raw: '150', unavailable: false, kmDeparture: 100 })
    expect(result).toEqual({ error: null, warning: null, distance: 50 })
  })

  it(`avisa acima de ${MAX_TRIP_KM} km, mas não no limite exato`, () => {
    const over = checkReturnKm({ raw: String(100 + MAX_TRIP_KM + 1), unavailable: false, kmDeparture: 100 })
    expect(over.error).toBeNull()
    expect(over.warning).toMatch(/acima de/)
    expect(checkReturnKm({ raw: String(100 + MAX_TRIP_KM), unavailable: false, kmDeparture: 100 }).warning).toBeNull()
  })

  it('sem KM de saída registrado não há com o que comparar', () => {
    expect(checkReturnKm({ raw: '5', unavailable: false, kmDeparture: null })).toEqual({
      error: null,
      warning: null,
      distance: null,
    })
  })
})
