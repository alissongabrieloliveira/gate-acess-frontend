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

// Extraído de dentro do hook pra ser reaproveitado pela exportação em PDF
// (todos os registros do filtro atual). Nome/placa/portão já vêm anexados
// em cada log pelo backend (GET /access-logs).
export function enrichAccessLog(log) {
  const { person, vehicle, entryGate, exitGate } = log
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

// `GET /access-logs` já suporta status/from/to/search/page — consumo com
// foco em histórico por período em vez de "o que está ativo agora" (que já é
// o papel de Controle de Acessos).
export function useAccessLogsReportData({ page, status, from, to, search }) {
  const [state, setState] = useState({ isLoading: true, error: null, logs: [], pagination: null })

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
    load()
  }, [load])

  const enrichedLogs = state.logs.map(enrichAccessLog)

  return { ...state, logs: enrichedLogs, refetch: load }
}
