// Lançamento retroativo (operador esqueceu de registrar na hora) — espelha
// backend/src/utils/retroactive.js: operador até 7 dias atrás, admin sem
// limite, nunca no futuro, motivo obrigatório. A API valida de novo.
import { RULES } from './rules'

export const OPERATOR_MAX_DAYS = 7
const DAY_MS = 24 * 60 * 60 * 1000
export const REASON_MIN = 5
export const REASON_MAX = 255

export function isAdminUser(user) {
  return !!(user?.rules & RULES.ADMIN)
}

/** Date -> valor de <input type="datetime-local"> (hora local, sem segundos). */
export function toDateTimeLocal(date) {
  const pad = (n) => String(n).padStart(2, '0')
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  )
}

/** Valor do datetime-local (hora local) -> ISO pra API; vazio/inválido -> null. */
export function dateTimeLocalToIso(value) {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

/** min/max dos campos de data: até agora; operador até 7 dias atrás. */
export function retroactiveBounds(isAdmin, now = new Date()) {
  return {
    min: isAdmin ? undefined : toDateTimeLocal(new Date(now.getTime() - OPERATOR_MAX_DAYS * DAY_MS)),
    max: toDateTimeLocal(now),
  }
}

/**
 * Confere o lançamento retroativo antes de enviar. `start`/`end` são valores
 * de datetime-local (`end` só quando a saída/retorno vai junto). Devolve a
 * mensagem de erro, ou null.
 */
export function checkRetroactive({ start, end, hasEnd = false, reason, isAdmin, startLabel, endLabel, now = new Date() }) {
  const startIso = dateTimeLocalToIso(start)
  if (!startIso) return `Informe a ${startLabel.toLowerCase()}.`
  const startMs = new Date(startIso).getTime()
  if (startMs > now.getTime()) return `${startLabel} não pode estar no futuro.`
  if (!isAdmin && now.getTime() - startMs > OPERATOR_MAX_DAYS * DAY_MS) {
    return `O lançamento retroativo vai até ${OPERATOR_MAX_DAYS} dias atrás — para uma data mais antiga, peça a um administrador.`
  }
  if (hasEnd) {
    const endIso = dateTimeLocalToIso(end)
    if (!endIso) return `Informe a ${endLabel.toLowerCase()}.`
    const endMs = new Date(endIso).getTime()
    if (endMs > now.getTime()) return `${endLabel} não pode estar no futuro.`
    if (endMs < startMs) return `${endLabel} não pode ser anterior à ${startLabel.toLowerCase()}.`
  }
  const text = (reason ?? '').trim()
  if (text.length < REASON_MIN) return 'Informe o motivo do lançamento retroativo.'
  if (text.length > REASON_MAX) return `O motivo pode ter no máximo ${REASON_MAX} caracteres.`
  return null
}
