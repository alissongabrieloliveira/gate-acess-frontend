import { formatKm, parseKm } from '../../lib/km'

// Regras de KM do Controle de Acessos. O backend é a fonte da verdade
// (access-logs.service.js); aqui só antecipamos com mensagens claras e
// adicionamos os AVISOS de plausibilidade, que não bloqueiam.
//
// Diferente da Frota, o veículo só circula até o estacionamento: a saída é
// NORMALMENTE IGUAL à entrada (igual é aceito), e só uma diferença pequena
// faz sentido — por isso o limite de aviso aqui é 10 km, não 1.000.
export const MAX_EXIT_DIFF_KM = 10

// people.person_type: 3 = Funcionário.
const PERSON_TYPE_EMPLOYEE = 3

// vehicles.vehicle_type: 2 = Frota Própria — tem controle próprio (Controle de
// Frota, onde o KM é sempre obrigatório) e NÃO passa pelo Controle de Acessos.
export const VEHICLE_TYPE_FLEET = 2

/**
 * KM só é obrigatório quando há veículo E a pessoa é Funcionário. Espelha
 * `isKmRequired` do backend.
 */
export function isKmRequired({ personType, hasVehicle }) {
  return hasVehicle && personType === PERSON_TYPE_EMPLOYEE
}

/**
 * Entrada: obrigatória quando `required` (salvo "KM indisponível"); opcional
 * caso contrário, mas se preenchida precisa ser válida. Aviso (não bloqueia)
 * se for menor que o último KM conhecido do veículo — o odômetro não volta.
 */
export function checkEntryKm({ raw, unavailable, required, lastKm }) {
  if (unavailable) return { error: null, warning: null }
  const km = parseKm(raw)
  if (km === null) {
    if (String(raw ?? '').trim() === '') {
      return {
        error: required ? 'Informe o KM de entrada (ou marque "KM indisponível").' : null,
        warning: null,
      }
    }
    return { error: 'KM de entrada inválido: informe um número inteiro.', warning: null }
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
 * Saída: obrigatória quando `required` (salvo "KM indisponível"). Menor que a
 * entrada é bloqueado; igual é o normal. Aviso (não bloqueia) se passar da
 * entrada em mais de MAX_EXIT_DIFF_KM.
 */
export function checkExitKm({ raw, unavailable, required, kmEntry }) {
  if (unavailable) return { error: null, warning: null }
  const km = parseKm(raw)
  if (km === null) {
    if (String(raw ?? '').trim() === '') {
      return {
        error: required ? 'Informe o KM de saída (ou marque "KM indisponível").' : null,
        warning: null,
      }
    }
    return { error: 'KM de saída inválido: informe um número inteiro.', warning: null }
  }
  if (kmEntry == null) return { error: null, warning: null }

  if (km < kmEntry) {
    return {
      error: `O KM de saída não pode ser menor que o KM de entrada (${formatKm(kmEntry)}). Se o painel do veículo não está legível, marque "KM indisponível".`,
      warning: null,
    }
  }
  const diff = km - kmEntry
  if (diff > MAX_EXIT_DIFF_KM) {
    return {
      error: null,
      warning: `Diferença de ${formatKm(diff)} km entre a entrada (${formatKm(kmEntry)}) e a saída (${formatKm(km)}) — acima de ${MAX_EXIT_DIFF_KM} km. O veículo só circulou dentro da empresa; confira o número.`,
    }
  }
  return { error: null, warning: null }
}

// Exibição do KM de um registro: mostra o KM real quando existe e só cai em
// "Não disponível" quando não há número (o flag isKmUnavailable é do registro
// inteiro — a entrada pode ter KM e a saída não, ou o contrário).
export function displayKmEntry(log) {
  if (log.kmEntry != null) return formatKm(log.kmEntry)
  return log.isKmUnavailable ? 'Não disponível' : '—'
}

export function displayKmExit(log) {
  if (log.kmExit != null) return formatKm(log.kmExit)
  if (!log.exitTime) return '----'
  return log.isKmUnavailable ? 'Não disponível' : '—'
}
