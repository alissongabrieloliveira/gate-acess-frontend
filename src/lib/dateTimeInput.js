const pad = (n) => String(n).padStart(2, '0')

// ISO (UTC, como vem da API) -> valor de <input type="datetime-local"> no
// fuso do navegador ("AAAA-MM-DDTHH:mm"). Vazio se não houver data.
export function toDateTimeLocal(value) {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

// Valor do <input type="datetime-local"> (hora local) -> ISO para a API.
// null se vazio/inválido.
export function fromDateTimeLocal(value) {
  if (!value) return null
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}
