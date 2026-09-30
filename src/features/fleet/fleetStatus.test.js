import { describe, expect, test } from 'vitest'
import { statusLabel, transportSummary } from './fleetStatus'

describe('statusLabel', () => {
  test('inclui o motivo quando o veículo não retorna', () => {
    expect(statusLabel({ status: 'NO_RETURN', noReturnReason: 'SOLD' })).toBe('Não Retorna (Vendido)')
    expect(statusLabel({ status: 'ON_TRIP', noReturnReason: null })).toBe('Na Rua')
  })
})

describe('transportSummary', () => {
  test('guincho levando veículo da frota e de terceiro', () => {
    expect(
      transportSummary({
        carriedLogs: [{ id: 2, vehicle: { licensePlate: 'ABC1D23' } }],
        carriedVehiclePlate: 'XYZ9876',
      })
    ).toEqual({ label: 'Levando', value: 'ABC-1D23, XYZ-9876' })
  })

  test('veículo levado em cima do guincho', () => {
    expect(transportSummary({ transportLogId: 1, transportingVehicle: { licensePlate: 'GCH3C45' }, carriedLogs: [] })).toEqual({
      label: 'Transportado por',
      value: 'GCH-3C45',
    })
  })

  test('registro antigo com guincho de terceiro', () => {
    expect(transportSummary({ transportedByPlate: 'QWE1234', carriedLogs: [] })).toEqual({ label: 'Guincho', value: 'QWE-1234' })
  })

  test('sem transporte', () => {
    expect(transportSummary({ carriedLogs: [] })).toBeNull()
    expect(transportSummary(null)).toBeNull()
  })
})
