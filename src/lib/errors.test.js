import { describe, expect, test } from 'vitest'
import { getErrorMessage } from './errors'

describe('getErrorMessage', () => {
  test('devolve a mensagem do backend quando presente (err.response.data.error)', () => {
    const err = { response: { data: { error: 'Credenciais inválidas' } } }
    expect(getErrorMessage(err)).toBe('Credenciais inválidas')
  })

  test('cai no fallback quando não há err.response', () => {
    expect(getErrorMessage(new Error('network error'), 'Falhou')).toBe('Falhou')
  })

  test('cai no fallback quando err.response.data.error está ausente', () => {
    const err = { response: { data: {} } }
    expect(getErrorMessage(err, 'Falhou')).toBe('Falhou')
  })

  test('cai no fallback padrão quando nenhum fallback é passado', () => {
    expect(getErrorMessage(undefined)).toBe('Ocorreu um erro inesperado. Tente novamente.')
  })
})
