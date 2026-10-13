import { formatPlateInput } from './format'

// Monta a lista exibida no sininho a partir
// de GET /dashboard/alerts (calculados na hora pelo backend — o alerta some
// sozinho quando o problema é resolvido).

const RETROACTIVE_EVENT_LABELS = {
  ENTRY: 'entrada',
  EXIT: 'saída',
  DEPARTURE: 'saída',
  RETURN: 'retorno',
}

// "5 min", "13h", "2d 5h" — tempo decorrido desde `since`.
export function formatElapsed(since, now = new Date()) {
  const minutes = Math.max(Math.floor((now - new Date(since)) / (60 * 1000)), 0)
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 48) return `${hours}h`
  const days = Math.floor(hours / 24)
  const rest = hours % 24
  return rest ? `${days}d ${rest}h` : `${days}d`
}

function formatDateTime(value) {
  return new Date(value).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
}

function vehicleLabel(vehicle) {
  if (!vehicle) return 'Veículo não encontrado'
  const plate = vehicle.licensePlate ? formatPlateInput(vehicle.licensePlate) : 'Sem placa'
  return vehicle.identificationCode ? `${plate} (Nº ${vehicle.identificationCode})` : plate
}

function joinEvents(events) {
  const labels = [...new Set(events.map((e) => RETROACTIVE_EVENT_LABELS[e.event] ?? e.event))]
  const text = labels.join(' e ')
  return text.charAt(0).toUpperCase() + text.slice(1)
}

/**
 * Lista plana, na ordem de prioridade: gateway offline, pessoas dentro há
 * muito tempo, frota na rua há muito tempo, lançamentos retroativos (admin).
 * `isAdmin` decide se o alerta do gateway leva para /gate-control (só admin
 * acessa essa tela).
 */
export function buildAlertItems(data, { isAdmin = false, now = new Date() } = {}) {
  if (!data) return []
  const items = []

  // Encerrado pelo operador (app do gateway fechado no fim do expediente) é
  // informação, não alarme; queda inesperada continua em vermelho.
  const gateway = data.gatewayOffline
  if (gateway?.closedByOperatorAt) {
    items.push({
      key: 'gateway',
      group: 'gateway',
      tone: 'info',
      title: 'Gateway das cancelas encerrado',
      description: `Encerrado pelo operador em ${formatDateTime(gateway.closedByOperatorAt)}. Os botões de cancela voltam a funcionar quando o app do gateway for aberto.`,
      to: isAdmin ? '/gate-control' : null,
    })
  } else if (gateway) {
    items.push({
      key: 'gateway',
      group: 'gateway',
      tone: 'danger',
      title: 'Gateway das cancelas offline',
      description: `Sem conexão há ${formatElapsed(gateway.offlineSince, now)}. Os botões de cancela não funcionam até ele voltar.`,
      to: isAdmin ? '/gate-control' : null,
    })
  }

  for (const alert of data.peopleInsideTooLong ?? []) {
    const plate = alert.vehicle ? ` · ${vehicleLabel(alert.vehicle)}` : ''
    items.push({
      key: `access-${alert.logId}`,
      group: 'people',
      tone: 'warning',
      title: `${alert.person?.name ?? 'Pessoa não encontrada'} dentro há ${formatElapsed(alert.entryTime, now)}`,
      description: `Entrada em ${formatDateTime(alert.entryTime)}${plate}. Saída não registrada?`,
      to: `/access-control/${alert.logId}`,
    })
  }

  for (const alert of data.fleetOnTripTooLong ?? []) {
    const parts = [`Saída em ${formatDateTime(alert.departureTime)}`]
    if (alert.isCarried) parts.push('transportado')
    else if (alert.driver) parts.push(alert.driver.name)
    if (alert.destination) parts.push(alert.destination)
    items.push({
      key: `fleet-${alert.logId}`,
      group: 'fleet',
      tone: 'warning',
      title: `${vehicleLabel(alert.vehicle)} na rua há ${formatElapsed(alert.departureTime, now)}`,
      description: `${parts.join(' · ')}. Retorno não registrado?`,
      to: `/fleet/${alert.logId}`,
    })
  }

  for (const alert of data.recentRetroactive ?? []) {
    const subject =
      alert.kind === 'ACCESS'
        ? (alert.person?.name ?? 'Pessoa não encontrada')
        : vehicleLabel(alert.vehicle)
    const reason = alert.events.find((e) => e.reason)?.reason
    items.push({
      key: `retro-${alert.kind}-${alert.logId}`,
      group: 'retroactive',
      tone: 'info',
      title: `Lançamento retroativo: ${subject}`,
      description: [
        joinEvents(alert.events),
        `por ${alert.operatorName ?? 'usuário removido'} em ${formatDateTime(alert.recordedAt)}`,
        reason && `Motivo: ${reason}`,
      ]
        .filter(Boolean)
        .join(' · '),
      to: alert.kind === 'ACCESS' ? `/access-control/${alert.logId}` : `/fleet/${alert.logId}`,
    })
  }

  return items
}
