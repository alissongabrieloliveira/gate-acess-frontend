import { useCallback, useEffect, useState } from 'react'
import { api } from '../../lib/api'

export const PAGE_SIZE = 8

// Usados só pela exportação em PDF (fetchAllAccessLogs) — não pela
// listagem paginada normal. 100 é o limite máximo aceito por
// access-logs.service.js; o teto de páginas é só uma rede de segurança
// contra um filtro que combine com um volume de dados fora do esperado
// pra uma portaria (dezenas a poucas centenas de registros — ver
// memoria.md), não pra travar exportações de verdade.
const EXPORT_PAGE_SIZE = 100
const EXPORT_MAX_PAGES = 20

function byId(records) {
  return new Map(records.map((record) => [record.id, record]))
}

// Extraído de dentro do hook pra ser reaproveitado pela exportação em PDF,
// que resolve nome/placa/portão sobre TODOS os registros do filtro atual
// (não só a página de 8 já carregada na tela).
export function enrichAccessLog(log, lookups) {
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
}

// Busca TODAS as páginas que casam com o filtro atual (não só as 8 já
// carregadas na tela) — usada exclusivamente pela exportação em PDF, que
// precisa do relatório completo, não de uma amostra.
export async function fetchAllAccessLogs({ status, from, to, search }) {
  const allLogs = []
  for (let page = 1; page <= EXPORT_MAX_PAGES; page += 1) {
    const { data } = await api.get('/access-logs', {
      params: {
        page,
        limit: EXPORT_PAGE_SIZE,
        status: status || undefined,
        from: from || undefined,
        to: to || undefined,
        search: search?.trim() || undefined,
      },
    })
    allLogs.push(...data.data)
    if (allLogs.length >= data.pagination.total || data.data.length < EXPORT_PAGE_SIZE) break
  }
  return allLogs
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

  const enrichedLogs = lookups ? state.logs.map((log) => enrichAccessLog(log, lookups)) : []

  return { ...state, logs: enrichedLogs, lookups, lookupsError, refetch: load }
}
