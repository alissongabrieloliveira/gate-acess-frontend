import { formatKm, parseKm } from '../../lib/km'

export { formatKm, parseKm }

// Regras de KM do Controle de Frota. O backend é a fonte da verdade
// (fleet-logs.service.js: obrigatório, inteiro, retorno > saída); aqui só
// antecipamos isso com mensagens claras e adicionamos os AVISOS de
// plausibilidade, que não bloqueiam: o operador confirma e segue.

// Acima disso numa única viagem, quase sempre é algarismo a mais.
export const MAX_TRIP_KM = 1000

/**
 * Saída: obrigatória (salvo "KM indisponível"). Aviso (não bloqueia) se for
 * menor que o último KM conhecido do veículo — o odômetro não volta.
 */
export function checkDepartureKm({ raw, unavailable, lastKm }) {
  if (unavailable) return { error: null, warning: null }
  const km = parseKm(raw)
  if (km === null) {
    return { error: 'Informe o KM de saída (ou marque "KM indisponível").', warning: null }
  }
  if (lastKm != null && km < lastKm) {
    return {
      error: null,
      warning: `O KM informado (${formatKm(km)}) é menor que o último KM registrado deste veículo (${formatKm(lastKm)}). O odômetro não volta — confira o número.`,
    }
  }
  return { error: null, warning: null }
}

/**
 * Retorno: obrigatório (salvo "KM indisponível") e ESTRITAMENTE maior que a
 * saída (igual é quase sempre o operador repetindo o número). Aviso (não
 * bloqueia) se o percorrido passar de MAX_TRIP_KM.
 */
export function checkReturnKm({ raw, unavailable, kmDeparture }) {
  if (unavailable) return { error: null, warning: null, distance: null }
  const km = parseKm(raw)
  if (km === null) {
    return { error: 'Informe o KM de retorno (ou marque "KM indisponível").', warning: null, distance: null }
  }
  if (kmDeparture == null) return { error: null, warning: null, distance: null }

  if (km <= kmDeparture) {
    return {
      error: `O KM de retorno deve ser maior que o KM de saída (${formatKm(kmDeparture)}). Se o painel do veículo não está legível, marque "KM indisponível".`,
      warning: null,
      distance: null,
    }
  }
  const distance = km - kmDeparture
  if (distance > MAX_TRIP_KM) {
    return {
      error: null,
      warning: `Percorrido de ${formatKm(distance)} km (saída ${formatKm(kmDeparture)}, retorno ${formatKm(km)}) — acima de ${formatKm(MAX_TRIP_KM)} km. Confira se não há algarismo a mais.`,
      distance,
    }
  }
  return { error: null, warning: null, distance }
}

// Exibição do KM de um registro: mostra o KM real quando existe e só cai em
// "Não disponível" quando não há número (o flag isKmUnavailable é do registro
// inteiro — a saída pode ter KM e o retorno não, ou o contrário).
export function displayKmDeparture(log) {
  if (log.kmDeparture != null) return formatKm(log.kmDeparture)
  return log.isKmUnavailable ? 'Não disponível' : '—'
}

export function displayKmReturn(log) {
  if (log.kmReturn != null) return formatKm(log.kmReturn)
  if (!log.returnTime) return '----'
  return log.isKmUnavailable ? 'Não disponível' : '—'
}

// KM rodado na viagem: retorno − saída. null quando ainda não voltou, falta
// um dos KMs ou o retorno é menor que a saída (só em dado antigo — hoje o
// backend exige retorno > saída): nunca mostra distância negativa.
export function kmDriven(log) {
  if (log.kmDeparture == null || log.kmReturn == null) return null
  const distance = log.kmReturn - log.kmDeparture
  return distance >= 0 ? distance : null
}

export function displayKmDriven(log) {
  if (!log.returnTime) return '----'
  const distance = kmDriven(log)
  return distance == null ? '—' : formatKm(distance)
}

// Soma do KM rodado dos registros que têm a distância (os demais não entram).
export function totalKmDriven(logs) {
  return logs.reduce((sum, log) => sum + (kmDriven(log) ?? 0), 0)
}
