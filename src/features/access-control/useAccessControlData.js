import { useCallback, useEffect, useState } from 'react'
import { api } from '../../lib/api'
import { isKmRequired } from './kmRules'

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
 * Setores e portões são carregados uma vez só — alimentam os selects do
 * "Nova Entrada" e o filtro de posto. Nome/CPF/placa/setor/portão de cada
 * access_log já vêm anexados pelo backend (GET /access-logs), então não há
 * mais amostra de "até 100" pessoas/veículos pra resolver as linhas.
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
      const [sectorsRes, gatesRes] = await Promise.all([
        api.get('/sectors', { params: { limit: 100 } }),
        api.get('/gates', { params: { limit: 100 } }),
      ])
      setLookups({
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
    loadLookups()
    loadLogs()
    loadCounts()
  }, [loadLookups, loadLogs, loadCounts])

  return { lookups, lookupsError, counts, ...logsState, refetch }
}

// Os dados relacionados já vêm no próprio log (backend, GET /access-logs).
export function enrichLog(log) {
  const { person, visitedPerson, vehicle, destinationSector: sector, entryGate, exitGate } = log
  return {
    ...log,
    personName: person?.name ?? 'Pessoa não encontrada',
    personCpf: person?.cpf ?? null,
    personType: person ? (PERSON_TYPE_LABELS[person.personType] ?? '—') : '—',
    kmRequired: isKmRequired({ personType: person?.personType, hasVehicle: !!log.vehicleId }),
    visitedPersonName: visitedPerson?.name ?? null,
    vehiclePlate: vehicle?.licensePlate ?? null,
    vehicleLabel: vehicle ? [vehicle.brand, vehicle.model].filter(Boolean).join(' ') || null : null,
    sectorName: sector?.name ?? null,
    entryGateName: entryGate?.name ?? '—',
    exitGateName: exitGate?.name ?? null,
  }
}
