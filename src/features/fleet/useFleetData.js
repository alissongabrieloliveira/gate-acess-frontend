import { useCallback, useEffect, useState } from 'react'
import { api } from '../../lib/api'

export const PAGE_SIZE = 8

function byId(records) {
  return new Map(records.map((record) => [record.id, record]))
}

/**
 * Mesmo padrão de `useAccessControlData` — cadastros (vehicles/people/gates)
 * carregados uma vez como "lookups" (amostra parcial de até 100) pra resolver
 * placa/motorista/portão nos fleet_logs, que só trazem IDs.
 */
// `search` (placa/motorista/destino) é resolvido pelo backend contra TODOS
// os fleet_logs da empresa, não só a página carregada — GET
// /fleet-logs?search= (ver fleet-logs.service.js). Sem isso, buscar um
// registro que está na página 2 enquanto o cliente só carregou a página 1
// nunca encontraria nada (mesmo bug já corrigido em Pessoas/Veículos/
// Controle de Acessos).
export function useFleetData({ status, page, search }) {
  const [lookups, setLookups] = useState(null)
  const [lookupsError, setLookupsError] = useState(null)
  const [logsState, setLogsState] = useState({ isLoading: true, error: null, logs: [], pagination: null })
  const [counts, setCounts] = useState({ onTrip: null, returned: null, total: null })

  const loadLookups = useCallback(async () => {
    try {
      const [vehiclesRes, peopleRes, gatesRes] = await Promise.all([
        api.get('/vehicles', { params: { limit: 100 } }),
        api.get('/people', { params: { limit: 100 } }),
        api.get('/gates', { params: { limit: 100 } }),
      ])
      setLookups({
        vehiclesById: byId(vehiclesRes.data.data),
        vehicles: vehiclesRes.data.data,
        peopleById: byId(peopleRes.data.data),
        people: peopleRes.data.data,
        gatesById: byId(gatesRes.data.data),
        gatesList: gatesRes.data.data,
      })
    } catch (err) {
      setLookupsError(err)
    }
  }, [])

  const loadCounts = useCallback(async () => {
    const [onTripRes, returnedRes, totalRes] = await Promise.all([
      api.get('/fleet-logs', { params: { status: 'ON_TRIP', limit: 1 } }),
      api.get('/fleet-logs', { params: { status: 'RETURNED', limit: 1 } }),
      api.get('/fleet-logs', { params: { limit: 1 } }),
    ])
    setCounts({
      onTrip: onTripRes.data.pagination.total,
      returned: returnedRes.data.pagination.total,
      total: totalRes.data.pagination.total,
    })
  }, [])

  const loadLogs = useCallback(async () => {
    setLogsState((s) => ({ ...s, isLoading: true, error: null }))
    try {
      const { data } = await api.get('/fleet-logs', {
        params: { status: status || undefined, page, limit: PAGE_SIZE, search: search?.trim() || undefined },
      })
      setLogsState({ isLoading: false, error: null, logs: data.data, pagination: data.pagination })
    } catch (err) {
      setLogsState({ isLoading: false, error: err, logs: [], pagination: null })
    }
  }, [status, page, search])

  useEffect(() => {
    loadLookups()
    loadCounts()
  }, [loadLookups, loadCounts])

  useEffect(() => {
    loadLogs()
  }, [loadLogs])

  const refetch = useCallback(() => {
    loadLookups()
    loadLogs()
    loadCounts()
  }, [loadLookups, loadLogs, loadCounts])

  return { lookups, lookupsError, counts, ...logsState, refetch }
}

export function enrichFleetLog(log, lookups) {
  const vehicle = lookups.vehiclesById.get(log.vehicleId)
  const driver = log.driverId ? lookups.peopleById.get(log.driverId) : null
  const transportingVehicle = log.transportingVehicleId ? lookups.vehiclesById.get(log.transportingVehicleId) : null
  const departureGate = lookups.gatesById.get(log.departureGateId)
  const returnGate = log.returnGateId ? lookups.gatesById.get(log.returnGateId) : null
  return {
    ...log,
    vehiclePlate: vehicle?.licensePlate ?? null,
    vehicleLabel: vehicle ? [vehicle.brand, vehicle.model].filter(Boolean).join(' ') || null : null,
    driverName: driver?.name ?? null,
    towPlate: transportingVehicle?.licensePlate ?? log.transportedByPlate ?? null,
    departureGateName: departureGate?.name ?? '—',
    returnGateName: returnGate?.name ?? null,
  }
}
