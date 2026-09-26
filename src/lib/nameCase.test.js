import { describe, expect, test } from 'vitest'
import { formatPersonName, formatPlaceName } from './nameCase'

describe('formatPersonName', () => {
  test.each([
    ['maria da silva', 'Maria da Silva'],
    ['JOÃO DOS SANTOS E SOUZA', 'João dos Santos e Souza'],
    ['ana-maria de oliveira', 'Ana-Maria de Oliveira'],
    ['érica ávila', 'Érica Ávila'],
    ['de souza', 'De Souza'],
    ['RH', 'Rh'],
  ])('%s -> %s', (input, expected) => {
    expect(formatPersonName(input)).toBe(expected)
  })

  test('preserva os espaços digitados (inclusive o do fim, pra digitar a próxima palavra)', () => {
    expect(formatPersonName('maria ')).toBe('Maria ')
    expect(formatPersonName('maria  da')).toBe('Maria  da')
  })

  test('vazio/nulo', () => {
    expect(formatPersonName('')).toBe('')
    expect(formatPersonName(null)).toBe('')
  })

  test('mantém o tamanho do texto (o cursor volta pro mesmo lugar)', () => {
    const input = 'JOSÉ DA SILVA E SOUZA'
    expect(formatPersonName(input)).toHaveLength(input.length)
  })
})

describe('formatPlaceName', () => {
  test.each([
    ['portaria principal', 'Portaria Principal'],
    ['setor de RH', 'Setor de RH'],
    ['TI', 'TI'],
    // Sigla é até 4 letras: palavra maiúscula mais longa vira inicial maiúscula.
    ['SET LOCAL', 'SET Local'],
    ['ALMOXARIFADO CENTRAL', 'Almoxarifado Central'],
    ['recepção', 'Recepção'],
  ])('%s -> %s', (input, expected) => {
    expect(formatPlaceName(input)).toBe(expected)
  })
})
