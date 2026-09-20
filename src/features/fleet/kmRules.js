// Regras de KM do Controle de Frota. O backend é a fonte da verdade
// (fleet-logs.service.js: obrigatório, inteiro, retorno > saída); aqui só
// antecipamos isso com mensagens claras e adicionamos os AVISOS de
// plausibilidade, que não bloqueiam: o operador confirma e segue.

// Acima disso numa única viagem, quase sempre é algarismo a mais.
export const MAX_TRIP_KM = 1000

export function formatKm(value) {
  return Number(value).toLocaleString('pt-BR')
}

// Inteiro não-negativo a partir do texto do input; null se vazio/inválido.
export function parseKm(raw) {
  const text = String(raw ?? '').trim()
  return /^\d+$/.test(text) ? Number(text) : null
}

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
