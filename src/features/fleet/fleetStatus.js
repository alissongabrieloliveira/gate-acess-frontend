import { formatPlateInput } from '../../lib/format'

export const STATUS_BADGES = {
  ON_TRIP: { label: 'Na Rua', className: 'bg-green-100 text-green-700' },
  RETURNED: { label: 'Retornado', className: 'bg-gray-100 text-gray-600' },
  NO_RETURN: { label: 'Não Retorna', className: 'bg-amber-100 text-amber-800' },
}

export function statusBadge(status) {
  return STATUS_BADGES[status] ?? { label: status, className: 'bg-gray-100 text-gray-700' }
}

// Mesmos valores de fleet_logs.no_return_reason / vehicles.operation_status.
export const NO_RETURN_REASONS = [
  { value: 'SOLD', label: 'Vendido' },
  { value: 'TRANSFERRED_BRANCH', label: 'Transferido para filial' },
  { value: 'TRANSFERRED_HQ', label: 'Transferido para matriz' },
]

export function noReturnReasonLabel(value) {
  return NO_RETURN_REASONS.find((reason) => reason.value === value)?.label ?? null
}

// "Não Retorna (Vendido)" — texto do status pra relatório/PDF.
export function statusLabel(log) {
  const base = statusBadge(log.status).label
  const reason = noReturnReasonLabel(log.noReturnReason)
  return reason ? `${base} (${reason})` : base
}

/**
 * Relação de transporte do registro, pra exibição:
 * - guincho da frota levando veículos: "Levando" + placas (da frota ou de terceiro);
 * - veículo levado em cima do guincho: "Transportado por" + placa do guincho;
 * - registros antigos (guincho de terceiro, antes da mudança): "Guincho".
 * `null` quando não há transporte. Recebe o log já com os relacionados do
 * backend (carriedLogs / transportingVehicle).
 */
export function transportSummary(log) {
  if (!log) return null
  if (log.transportLogId || log.transportingVehicle) {
    const plate = log.transportingVehicle?.licensePlate
    return { label: 'Transportado por', value: plate ? formatPlateInput(plate) : 'Guincho da frota' }
  }
  const carriedPlates = [
    ...(log.carriedLogs ?? []).map((carried) => carried.vehicle?.licensePlate).filter(Boolean),
    ...(log.carriedVehiclePlate ? [log.carriedVehiclePlate] : []),
  ]
  if (carriedPlates.length > 0) {
    return { label: 'Levando', value: carriedPlates.map(formatPlateInput).join(', ') }
  }
  if (log.transportedByPlate) {
    return { label: 'Guincho', value: formatPlateInput(log.transportedByPlate) }
  }
  return null
}
