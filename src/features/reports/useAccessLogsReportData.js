import { useCallback, useEffect, useState } from 'react'
import { api } from '../../lib/api'

export const PAGE_SIZE = 8

function byId(records) {
  return new Map(records.map((record) => [record.id, record]))
}

// Mesmo padrão de "lookups" já usado em Controle de Acessos/Frota: os
// cadastros (people/vehicles/gates) só entram como amostra de até 100 pra
// resolver nome/placa/portão a partir dos IDs que access_logs guarda.
// `GET /access-logs` já suporta status/from/to/search/page — sem mudança
// nenhuma no backend, só um consumo novo com foco em histórico por período
// em vez de "o que está ativo agora" (que já é o papel de Controle de
// Acessos).
export function useAccessLogsReportData({ page, status, from, to, search }) {
  const [lookups, setLookups] = useState(null)
  const [lookupsError, setLookupsError] = useState(null)
  const [state, setState] = useState({ isLoading: true, error: null, logs: [], pagination: null })

  const loadLookups = useCallback(async () => {
    try {
      const [peopleRes, vehiclesRes, gatesRes] = await Promise.all([
        api.get('/people', { params: { limit: 100 } }),
        api.get('/vehicles', { params: { limit: 100 } }),
        api.get('/gates', { params: { limit: 100 } }),
      ])
      setLookups({
        peopleById: byId(peopleRes.data.data),
        vehiclesById: byId(vehiclesRes.data.data),
        gatesById: byId(gatesRes.data.data),
      })
    } catch (err) {
      setLookupsError(err)
    }
  }, [])

  const load = useCallback(async () => {
    setState((s) => ({ ...s, isLoading: true, error: null }))
    try {
      const { data } = await api.get('/access-logs', {
        params: {
          page,
          limit: PAGE_SIZE,
          status: status || undefined,
          from: from || undefined,
          to: to || undefined,
          search: search?.trim() || undefined,
        },
      })
      setState({ isLoading: false, error: null, logs: data.data, pagination: data.pagination })
    } catch (err) {
      setState({ isLoading: false, error: err, logs: [], pagination: null })
    }
  }, [page, status, from, to, search])

  useEffect(() => {
    loadLookups()
  }, [loadLookups])

  useEffect(() => {
    load()
  }, [load])

  const enrichedLogs = lookups
    ? state.logs.map((log) => {
        const person = lookups.peopleById.get(log.personId)
        const vehicle = log.vehicleId ? lookups.vehiclesById.get(log.vehicleId) : null
        const entryGate = lookups.gatesById.get(log.entryGateId)
        const exitGate = log.exitGateId ? lookups.gatesById.get(log.exitGateId) : null
        return {
          ...log,
          personName: person?.name ?? `Pessoa #${log.personId}`,
          personCpf: person?.cpf ?? null,
          vehiclePlate: vehicle?.licensePlate ?? null,
          entryGateName: entryGate?.name ?? '—',
          exitGateName: exitGate?.name ?? null,
        }
      })
    : []

  return { ...state, logs: enrichedLogs, lookups, lookupsError, refetch: load }
}
