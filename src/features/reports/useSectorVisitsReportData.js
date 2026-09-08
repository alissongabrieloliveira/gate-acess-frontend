import { useCallback, useEffect, useState } from 'react'
import { api } from '../../lib/api'
import { fetchAllAccessLogs } from './useAccessLogsReportData'

// Setor sintético pra acessos sem destino registrado (destinationSectorId
// null) — access_logs.destination_sector_id é opcional no schema, mesmo
// que o slide-over "Nova Entrada" sempre exija um na prática. Sem esse
// balde, esses acessos simplesmente desapareceriam da soma, e o total do
// relatório não bateria com o total real de acessos do período.
const NO_SECTOR = { id: null, name: 'Sem Setor', description: null, isActive: true }

/**
 * "Visitas por Setor": não é uma listagem paginada como os outros
 * relatórios (Acessos/Frota/Pessoas Bloqueadas) — é um agregado (contagem
 * de access_logs por destinationSectorId num período), então busca
 * TODOS os setores (GET /sectors, amostra de até 100 — mesmo critério de
 * "lookups" já usado no resto do projeto) e TODOS os access_logs do
 * período (reaproveita fetchAllAccessLogs, já usado pela exportação em PDF
 * do relatório de Acessos — aqui é a fonte primária do dado, não só da
 * exportação), sem paginação na tela (poucos setores, não faz sentido
 * paginar um resumo).
 */
export function useSectorVisitsReportData({ from, to }) {
  const [state, setState] = useState({ isLoading: true, error: null, breakdown: [], total: 0 })

  const load = useCallback(async () => {
    setState((s) => ({ ...s, isLoading: true, error: null }))
    try {
      const [sectorsRes, logs] = await Promise.all([
        api.get('/sectors', { params: { limit: 100 } }),
        fetchAllAccessLogs({ from, to }),
      ])

      const counts = new Map()
      for (const log of logs) {
        const key = log.destinationSectorId ?? NO_SECTOR.id
        counts.set(key, (counts.get(key) ?? 0) + 1)
      }

      const total = logs.length
      const sectors = [...sectorsRes.data.data, NO_SECTOR]
      const breakdown = sectors
        .map((sector) => {
          const count = counts.get(sector.id) ?? 0
          return {
            id: sector.id,
            name: sector.name,
            description: sector.description,
            isActive: sector.isActive,
            count,
            pct: total > 0 ? Math.round((count / total) * 1000) / 10 : 0,
          }
        })
        // Setor "Sem Setor" some quando não há nenhum acesso sem destino —
        // não faz sentido poluir o relatório com uma linha zerada que
        // nunca vai acontecer na prática (frontend sempre exige o campo).
        .filter((row) => row.id !== NO_SECTOR.id || row.count > 0)
        .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'pt-BR'))

      setState({ isLoading: false, error: null, breakdown, total })
    } catch (err) {
      setState({ isLoading: false, error: err, breakdown: [], total: 0 })
    }
  }, [from, to])

  useEffect(() => {
    load()
  }, [load])

  return { ...state, refetch: load }
}
