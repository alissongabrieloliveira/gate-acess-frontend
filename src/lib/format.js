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
