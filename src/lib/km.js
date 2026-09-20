// Inteiro não-negativo a partir do texto do input; null se vazio/inválido.
export function parseKm(raw) {
  const text = String(raw ?? '').trim()
  return /^\d+$/.test(text) ? Number(text) : null
}

export function formatKm(value) {
  return Number(value).toLocaleString('pt-BR')
}
