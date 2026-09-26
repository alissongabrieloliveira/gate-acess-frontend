// Conectivos que ficam em minúsculo no meio do nome ("Maria da Silva").
const PARTICLES = new Set(['da', 'de', 'do', 'das', 'dos', 'e'])

// Primeira letra maiúscula e o resto minúsculo; também depois de hífen
// ("ana-maria" -> "Ana-Maria").
function capitalize(word) {
  return word
    .toLocaleLowerCase('pt-BR')
    .replace(/(^|-)(\p{L})/gu, (_, sep, letter) => sep + letter.toLocaleUpperCase('pt-BR'))
}

function formatWords(value, keepWord) {
  let isFirstWord = true
  // Mantém os espaços exatamente como digitados (inclusive o do fim, senão
  // não daria pra digitar a próxima palavra).
  return value
    .split(/(\s+)/)
    .map((part) => {
      if (part === '' || /^\s+$/.test(part)) return part
      const first = isFirstWord
      isFirstWord = false
      if (keepWord?.(part)) return part
      const lower = part.toLocaleLowerCase('pt-BR')
      if (!first && PARTICLES.has(lower)) return lower
      return capitalize(part)
    })
    .join('')
}

/** Nome de pessoa/usuário: "JOÃO DA SILVA" -> "João da Silva". */
export function formatPersonName(value) {
  return formatWords(String(value ?? ''), null)
}

// Sigla: palavra toda em maiúsculo, de 2 a 4 letras ("RH", "TI", "SESMT" não).
const isAcronym = (word) => /^\p{Lu}{2,4}$/u.test(word)

/**
 * Nome de posto de controle/setor: igual ao de pessoa, mas preserva siglas
 * digitadas em maiúsculo ("setor de RH" -> "Setor de RH").
 */
export function formatPlaceName(value) {
  return formatWords(String(value ?? ''), isAcronym)
}

/**
 * onChange de um input com formatação de maiúsculas: aplica `format` e
 * devolve o cursor pra onde estava. Sem isso, como o React troca o valor do
 * input, o cursor pularia pro fim ao corrigir uma letra no meio do nome.
 */
export function handleNameChange(event, format, setValue) {
  const input = event.target
  const formatted = format(input.value)
  // Escreve o valor formatado no próprio input já com o cursor restaurado:
  // quando o React renderiza, o DOM já tem o valor novo e ele não mexe no
  // cursor. (Restaurar depois, num requestAnimationFrame, perde letras de
  // quem digita rápido — a próxima tecla chega antes.)
  if (formatted !== input.value) {
    const { selectionStart, selectionEnd } = input
    input.value = formatted
    input.setSelectionRange(selectionStart, selectionEnd)
  }
  setValue(formatted)
}
