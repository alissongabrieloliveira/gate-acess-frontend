import { describe, expect, it } from 'vitest'
import { openEntryConflicts } from './openEntries'

const active = [
  { id: 1, personId: 10, vehicleId: 20, entryTime: '2026-10-05T11:00:00Z', person: { name: 'Carlos' } },
  { id: 2, personId: 11, vehicleId: null, entryTime: '2026-10-05T12:00:00Z', person: { name: 'Ana' } },
]

describe('openEntryConflicts', () => {
  it('sem conflito quando pessoa e veículo não estão dentro', () => {
    expect(openEntryConflicts(active, { personId: 99, vehicleId: 98 })).toEqual({})
    expect(openEntryConflicts(active, { personId: undefined, vehicleId: undefined })).toEqual({})
  })

  it('pessoa que já está dentro', () => {
    const { person, vehicle } = openEntryConflicts(active, { personId: 11 })
    expect(person).toMatch(/Já está dentro/)
    expect(vehicle).toBeUndefined()
  })

  it('placa que já está dentro com outra pessoa mostra quem está com ela', () => {
    const { person, vehicle } = openEntryConflicts(active, { personId: 99, vehicleId: 20 })
    expect(person).toBeUndefined()
    expect(vehicle).toMatch(/Veículo já está dentro.*com Carlos/)
  })
})
