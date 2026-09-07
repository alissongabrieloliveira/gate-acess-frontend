import { useCallback, useEffect, useState } from 'react'
import { api } from '../../lib/api'

export const PAGE_SIZE = 8

function byId(records) {
  return new Map(records.map((record) => [record.id, record]))
}

// 1=Visitante, 2=Prestador, 3=Funcionário — gate_schema.sql / people.service.js.
export const PERSON_TYPE_LABELS = { 1: 'Visitante', 2: 'Prestador', 3: 'Funcionário' }
export const PERSON_TYPES = [
  { value: 1, label: 'Visitante' },
  { value: 2, label: 'Prestador' },
  { value: 3, label: 'Funcionário' },
]

/**
 * Cadastros (people/vehicles/sectors/gates) são carregados uma vez só — servem
 * de "lookup" pra resolver nome/placa/destino nos access_logs, que só trazem
 * IDs. Igual limitação documentada no dashboard: só a primeira página
 * (limit=100) de cada cadastro é buscada.
 */
// `search` (CPF/Nome/Placa) é resolvido pelo backend contra TODOS os
// access_logs da empresa, não só a página carregada — GET
// /access-logs?search= (ver access-logs.service.js). Sem isso, buscar um
// registro que está na página 2 enquanto o cliente só carregou a página 1
// nunca encontraria nada (mesmo bug já corrigido em Pessoas/Veículos).
export function useAccessControlData({ status, page, search }) {
  const [lookups, setLookups] = useState(null)
  const [lookupsError, setLookupsError] = useState(null)
  const [logsState, setLogsState] = useState({ isLoading: true, error: null, logs: [], pagination: null })
  const [counts, setCounts] = useState({ active: null, finished: null, total: null })

  const loadLookups = useCallback(async () => {
    try {
      const [peopleRes, vehiclesRes, sectorsRes, gatesRes] = await Promise.all([
        api.get('/people', { params: { limit: 100 } }),
        api.get('/vehicles', { params: { limit: 100 } }),
        api.get('/sectors', { params: { limit: 100 } }),
        api.get('/gates', { params: { limit: 100 } }),
      ])
      setLookups({
        peopleById: byId(peopleRes.data.data),
        people: peopleRes.data.data,
        vehiclesById: byId(vehiclesRes.data.data),
        vehicles: vehiclesRes.data.data,
        sectorsById: byId(sectorsRes.data.data),
        sectors: sectorsRes.data.data,
        gatesById: byId(gatesRes.data.data),
        gatesList: gatesRes.data.data,
      })
    } catch (err) {
      setLookupsError(err)
    }
  }, [])

  const loadCounts = useCallback(async () => {
    const [activeRes, finishedRes, totalRes] = await Promise.all([
      api.get('/access-logs', { params: { status: 'ACTIVE', limit: 1 } }),
      api.get('/access-logs', { params: { status: 'FINISHED', limit: 1 } }),
      api.get('/access-logs', { params: { limit: 1 } }),
    ])
    setCounts({
      active: activeRes.data.pagination.total,
      finished: finishedRes.data.pagination.total,
      total: totalRes.data.pagination.total,
    })
  }, [])

  const loadLogs = useCallback(async () => {
    setLogsState((s) => ({ ...s, isLoading: true, error: null }))
    try {
      const { data } = await api.get('/access-logs', {
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
    // Recarrega os lookups também — sem isso, uma pessoa/veículo criado na
    // hora (via NewEntryDrawer) não aparece resolvido na tabela até um reload
    // de página inteira, já que o mapa id->registro só era buscado uma vez.
    loadLookups()
    loadLogs()
    loadCounts()
  }, [loadLookups, loadLogs, loadCounts])

  return { lookups, lookupsError, counts, ...logsState, refetch }
}

export function enrichLog(log, lookups) {
  const person = lookups.peopleById.get(log.personId)
  const visitedPerson = log.visitedPersonId ? lookups.peopleById.get(log.visitedPersonId) : null
  const vehicle = log.vehicleId ? lookups.vehiclesById.get(log.vehicleId) : null
  const sector = log.destinationSectorId ? lookups.sectorsById.get(log.destinationSectorId) : null
  const entryGate = lookups.gatesById.get(log.entryGateId)
  const exitGate = log.exitGateId ? lookups.gatesById.get(log.exitGateId) : null
  return {
    ...log,
    personName: person?.name ?? 'Pessoa não encontrada',
    personCpf: person?.cpf ?? null,
    personType: person ? (PERSON_TYPE_LABELS[person.personType] ?? '—') : '—',
    visitedPersonName: visitedPerson?.name ?? null,
    vehiclePlate: vehicle?.licensePlate ?? null,
    vehicleLabel: vehicle ? [vehicle.brand, vehicle.model].filter(Boolean).join(' ') || null : null,
    sectorName: sector?.name ?? null,
    entryGateName: entryGate?.name ?? '—',
    exitGateName: exitGate?.name ?? null,
  }
}
