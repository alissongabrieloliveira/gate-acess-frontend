import { useCallback, useEffect, useState } from 'react'
import { api } from '../../lib/api'

export const PAGE_SIZE = 8

// Mesmo raciocínio de useAccessLogsReportData.js — só usados pela
// exportação em PDF (fetchAllFleetLogs), não pela listagem paginada.
const EXPORT_PAGE_SIZE = 100
const EXPORT_MAX_PAGES = 20

// Extraído do hook pra ser reaproveitado pela exportação em PDF (nome
// diferente de enrichFleetLog em features/fleet/useFleetData.js — mesmo
// formato, módulo separado, evita confundir os dois na tela de Frota
// operacional).
export function enrichFleetLogReport(log) {
  const { vehicle, driver } = log
  return {
    ...log,
    vehiclePlate: vehicle?.licensePlate ?? null,
    vehicleLabel: vehicle ? [vehicle.brand, vehicle.model].filter(Boolean).join(' ') || null : null,
    vehicleIdentification: vehicle?.identificationCode ?? null,
    driverName: driver?.name ?? null,
  }
}

// Busca TODAS as páginas que casam com o filtro atual — usada só pela
// exportação em PDF, mesmo padrão de fetchAllAccessLogs.
export async function fetchAllFleetLogs({ status, from, to, search }) {
  const allLogs = []
  for (let page = 1; page <= EXPORT_MAX_PAGES; page += 1) {
    const { data } = await api.get('/fleet-logs', {
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

// Mesmo padrão de useAccessLogsReportData.js — `GET /fleet-logs` já suporta
// status/from/to/search/page (ver fleet-logs.service.js), sem mudança
// nenhuma no backend. Complementa Controle de Frota (que só mostra o que
// está na rua/retornado agora) com um histórico filtrável por período.
export function useFleetLogsReportData({ page, status, from, to, search }) {
  const [state, setState] = useState({ isLoading: true, error: null, logs: [], pagination: null })

  const load = useCallback(async () => {
    setState((s) => ({ ...s, isLoading: true, error: null }))
    try {
      const { data } = await api.get('/fleet-logs', {
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
    load()
  }, [load])

  const enrichedLogs = state.logs.map(enrichFleetLogReport)

  return { ...state, logs: enrichedLogs, refetch: load }
}
