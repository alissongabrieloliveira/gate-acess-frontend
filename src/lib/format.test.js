import { describe, expect, test } from 'vitest'
import { formatCpf, formatPhone, formatPlateInput, formatRg, isValidCpf } from './format'

describe('formatPlateInput', () => {
  test.each([
    ['ABC1116', 'ABC-1116'],
    ['ABC1A16', 'ABC-1A16'],
    ['abc1116', 'ABC-1116'],
    ['ABC-1116', 'ABC-1116'], // idempotente
    ['AB', 'AB'], // menos de 3 caracteres, sem traço ainda
    ['ABC', 'ABC'], // exatamente 3, sem traço ainda
    ['ABC11169999', 'ABC-1116'], // trunca em 7 caracteres úteis
    ['', ''],
  ])('%s -> %s', (input, expected) => {
    expect(formatPlateInput(input)).toBe(expected)
  })

  test('null/undefined não quebram', () => {
    expect(formatPlateInput(null)).toBe('')
    expect(formatPlateInput(undefined)).toBe('')
  })
})

describe('formatCpf', () => {
  test.each([
    ['12345678910', '123.456.789-10'],
    ['123.456.789-10', '123.456.789-10'], // idempotente (só usa os dígitos)
    ['123', '123'], // digitação parcial
    ['123456', '123.456'],
    ['123456789', '123.456.789'],
    ['1234567891099', '123.456.789-10'], // trunca em 11 dígitos
    ['', ''],
  ])('%s -> %s', (input, expected) => {
    expect(formatCpf(input)).toBe(expected)
  })

  test('null/undefined não quebram', () => {
    expect(formatCpf(null)).toBe('')
    expect(formatCpf(undefined)).toBe('')
  })
})

describe('isValidCpf', () => {
  test.each([
    ['12345678909', true],
    ['123.456.789-09', true],
    ['11144477735', true],
    ['11122233344', false], // dígito verificador incorreto
    ['11111111111', false], // todos os dígitos iguais
    ['1234567890', false], // menos de 11 dígitos
    ['', false],
  ])('%s -> %s', (input, expected) => {
    expect(isValidCpf(input)).toBe(expected)
  })

  test('null/undefined não quebram', () => {
    expect(isValidCpf(null)).toBe(false)
    expect(isValidCpf(undefined)).toBe(false)
  })
})

describe('formatPhone', () => {
  test.each([
    ['1112345678', '(11) 1234-5678'], // fixo, 10 dígitos
    ['11912345678', '(11) 91234-5678'], // celular, 11 dígitos
    ['11', '(11'], // digitação parcial
    ['111234', '(11) 1234'],
    ['', ''],
  ])('%s -> %s', (input, expected) => {
    expect(formatPhone(input)).toBe(expected)
  })

  test('reformata de fixo pra celular ao completar o 11º dígito', () => {
    const tenDigits = formatPhone('1112345678')
    const elevenDigits = formatPhone('11123456789')
    expect(tenDigits).toBe('(11) 1234-5678')
    expect(elevenDigits).toBe('(11) 12345-6789')
  })

  test('null/undefined não quebram', () => {
    expect(formatPhone(null)).toBe('')
    expect(formatPhone(undefined)).toBe('')
  })
})

describe('formatRg', () => {
  test.each([
    ['123456789', '12.345.678-9'],
    ['12345678X', '12.345.678-X'], // dígito verificador em X
    ['12345678x', '12.345.678-X'], // aceita minúsculo, normaliza pra maiúsculo
    ['12', '12'],
    ['1234567899999', '12.345.678-9'], // trunca em 9 caracteres
    ['', ''],
  ])('%s -> %s', (input, expected) => {
    expect(formatRg(input)).toBe(expected)
  })

  test('null/undefined não quebram', () => {
    expect(formatRg(null)).toBe('')
    expect(formatRg(undefined)).toBe('')
  })
})
