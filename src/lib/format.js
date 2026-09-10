/**
 * Formata a placa com traço pra exibição/digitação ("ABC1116" -> "ABC-1116",
 * "ABC1A16" -> "ABC-1A16") — cobre tanto o formato antigo (4 dígitos) quanto
 * o Mercosul (dígito-letra-dígito-dígito), já que a regra é só "traço depois
 * do 3º caractere", sem validar o que vem depois. Idempotente (rodar de novo
 * em cima de um valor já formatado devolve o mesmo resultado), por isso serve
 * tanto pro onChange de um campo quanto pra exibir um valor já salvo — o
 * backend continua normalizando (maiúsculas, sem traço) antes de gravar no
 * banco. Usada em mais de uma feature (vehicles, access-control), por isso
 * mora em lib/ em vez de dentro de um único feature.
 */
export function formatPlateInput(value) {
  const clean = String(value ?? '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 7)
  if (clean.length <= 3) return clean
  return `${clean.slice(0, 3)}-${clean.slice(3)}`
}

/**
 * Formata CPF pra exibição ("12345678910" -> "123.456.789-10"). O backend não
 * normaliza o CPF de `people` (fica salvo criptografado exatamente como foi
 * digitado), então isso precisa tolerar entrada já pontuada ou só dígitos —
 * sempre parte dos dígitos crus. Formata progressivamente (útil também se
 * algum dia virar máscara de digitação), não exige os 11 dígitos completos.
 */
export function formatCpf(value) {
  const digits = String(value ?? '')
    .replace(/\D/g, '')
    .slice(0, 11)
  if (digits.length <= 3) return digits
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`
}

/**
 * Valida CPF pelo algoritmo padrão de dígito verificador (mod 11) — mesmo
 * cálculo replicado em backend/src/utils/cpf.js (repositórios separados,
 * sem import compartilhado, mesmo critério já usado em lib/rules.js).
 * Validação real acontece sempre no backend antes de gravar; isso aqui é só
 * pra dar feedback imediato no formulário sem round-trip.
 */
export function isValidCpf(value) {
  const digits = String(value ?? '').replace(/\D/g, '')
  if (digits.length !== 11) return false
  if (/^(\d)\1{10}$/.test(digits)) return false

  const checkDigit = (base) => {
    let sum = 0
    let weight = base.length + 1
    for (const char of base) {
      sum += Number(char) * weight
      weight -= 1
    }
    const remainder = sum % 11
    return remainder < 2 ? 0 : 11 - remainder
  }

  const base = digits.slice(0, 9)
  const digit1 = checkDigit(base)
  const digit2 = checkDigit(base + digit1)

  return digits === `${base}${digit1}${digit2}`
}

/**
 * Formata telefone pra exibição/digitação — 10 dígitos vira fixo
 * ("(11) 1234-5678"), 11 dígitos vira celular ("(11) 91234-5678"). Igual ao
 * CPF, o backend não normaliza `people.phone` (grava exatamente o que
 * chega), então isso só formata pra exibição/máscara — o envio pro backend
 * usa só os dígitos. Formata progressivamente: enquanto o usuário ainda não
 * digitou o 11º dígito, assume o corte de fixo (4-4); ao digitar o 11º,
 * reformata pro corte de celular (5-4) — comportamento padrão de máscara de
 * telefone brasileira.
 */
export function formatPhone(value) {
  const digits = String(value ?? '')
    .replace(/\D/g, '')
    .slice(0, 11)
  if (digits.length === 0) return ''
  if (digits.length <= 2) return `(${digits}`
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
}

/**
 * Formata CNPJ pra exibição/digitação ("12345678000190" -> "12.345.678/0001-90").
 * Igual ao CPF/telefone, formata progressivamente (não exige os 14 dígitos
 * completos) e sempre parte dos dígitos crus — o backend normaliza sozinho
 * (trigger normalize_company_cnpj, ver create_companies) antes de gravar.
 */
export function formatCnpj(value) {
  const digits = String(value ?? '')
    .replace(/\D/g, '')
    .slice(0, 14)
  if (digits.length <= 2) return digits
  if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`
  if (digits.length <= 8) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`
  if (digits.length <= 12) {
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`
  }
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`
}

/**
 * Valida CNPJ pelo algoritmo padrão de dígito verificador (mod 11) — mesmo
 * cálculo replicado em backend/src/db/migrations (função is_valid_cnpj do
 * Postgres) e em backend/tests/helpers/factories.js#randomValidCnpj. Só dá
 * feedback imediato no formulário sem round-trip; a validação que realmente
 * vale é a do banco (CHECK constraint em companies.cnpj).
 */
export function isValidCnpj(value) {
  const digits = String(value ?? '').replace(/\D/g, '')
  if (digits.length !== 14) return false
  if (/^(\d)\1{13}$/.test(digits)) return false

  const checkDigit = (base, weights) => {
    const sum = base.split('').reduce((acc, char, index) => acc + Number(char) * weights[index], 0)
    const remainder = sum % 11
    return remainder < 2 ? 0 : 11 - remainder
  }

  const base = digits.slice(0, 12)
  const digit1 = checkDigit(base, [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2])
  const digit2 = checkDigit(base + digit1, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2])

  return digits === `${base}${digit1}${digit2}`
}

/**
 * Formata RG pra exibição/digitação no padrão mais comum ("12.345.678-9").
 * O último caractere aceita dígito ou "X" (dígito verificador de alguns
 * estados) — sem validação de formato por UF (RG não tem padrão nacional
 * único), só uma máscara visual consistente com o resto do projeto. Mesma
 * assimetria do CPF: o campo mostra formatado, o backend não normaliza
 * `people.rg` (grava exatamente o que chega), então o envio usa só os
 * caracteres crus (sem pontuação).
 */
export function formatRg(value) {
  const raw = String(value ?? '')
    .toUpperCase()
    .replace(/[^0-9X]/g, '')
    .slice(0, 9)
  if (raw.length <= 2) return raw
  if (raw.length <= 5) return `${raw.slice(0, 2)}.${raw.slice(2)}`
  if (raw.length <= 8) return `${raw.slice(0, 2)}.${raw.slice(2, 5)}.${raw.slice(5)}`
  return `${raw.slice(0, 2)}.${raw.slice(2, 5)}.${raw.slice(5, 8)}-${raw.slice(8)}`
}
