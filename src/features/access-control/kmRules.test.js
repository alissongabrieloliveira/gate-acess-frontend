import { describe, expect, it } from 'vitest'
import { MAX_EXIT_DIFF_KM, checkEntryKm, checkExitKm, isKmRequired } from './kmRules'

describe('isKmRequired', () => {
  it('só exige com veículo, e apenas para Funcionário', () => {
    expect(isKmRequired({ personType: 3, hasVehicle: true })).toBe(true)
    expect(isKmRequired({ personType: 1, hasVehicle: true })).toBe(false)
    expect(isKmRequired({ personType: 2, hasVehicle: true })).toBe(false)
  })

  it('sem veículo nunca exige, nem para funcionário', () => {
    expect(isKmRequired({ personType: 3, hasVehicle: false })).toBe(false)
  })
})

describe('checkEntryKm', () => {
  it('obrigatório vazio -> erro; opcional vazio -> ok; indisponível dispensa', () => {
    expect(checkEntryKm({ raw: '', unavailable: false, required: true, lastKm: null }).error).toMatch(/Informe o KM de entrada/)
    expect(checkEntryKm({ raw: '', unavailable: false, required: false, lastKm: null }).error).toBeNull()
    expect(checkEntryKm({ raw: '', unavailable: true, required: true, lastKm: 9 }).error).toBeNull()
  })

  it('opcional preenchido com lixo continua sendo erro', () => {
    expect(checkEntryKm({ raw: '12.5', unavailable: false, required: false, lastKm: null }).error).toMatch(/inválido/)
  })

  it('avisa (sem bloquear) quando é menor que o último KM conhecido', () => {
    const result = checkEntryKm({ raw: '1011', unavailable: false, required: true, lastKm: 10115 })
    expect(result.error).toBeNull()
    expect(result.warning).toMatch(/menor que o último KM registrado/)
    expect(checkEntryKm({ raw: '10115', unavailable: false, required: true, lastKm: 10115 }).warning).toBeNull()
  })
})

describe('checkExitKm', () => {
  it('obrigatório vazio -> erro; opcional vazio -> ok', () => {
    expect(checkExitKm({ raw: '', unavailable: false, required: true, kmEntry: 100 }).error).toMatch(/Informe o KM de saída/)
    expect(checkExitKm({ raw: '', unavailable: false, required: false, kmEntry: 100 }).error).toBeNull()
  })

  it('bloqueia saída menor que a entrada, mas aceita igual', () => {
    expect(checkExitKm({ raw: '99', unavailable: false, required: true, kmEntry: 100 }).error).toMatch(/menor que o KM de entrada/)
    expect(checkExitKm({ raw: '100', unavailable: false, required: true, kmEntry: 100 })).toEqual({ error: null, warning: null })
  })

  it(`avisa acima de ${MAX_EXIT_DIFF_KM} km de diferença, mas não no limite exato`, () => {
    const over = checkExitKm({ raw: String(100 + MAX_EXIT_DIFF_KM + 1), unavailable: false, required: true, kmEntry: 100 })
    expect(over.error).toBeNull()
    expect(over.warning).toMatch(/acima de/)
    expect(checkExitKm({ raw: String(100 + MAX_EXIT_DIFF_KM), unavailable: false, required: true, kmEntry: 100 }).warning).toBeNull()
  })

  it('sem KM de entrada registrado não há com o que comparar', () => {
    expect(checkExitKm({ raw: '5', unavailable: false, required: true, kmEntry: null })).toEqual({ error: null, warning: null })
  })
})
