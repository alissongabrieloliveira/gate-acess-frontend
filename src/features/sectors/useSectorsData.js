import { useCallback, useEffect, useState } from 'react'
import { api } from '../../lib/api'

export const PAGE_SIZE = 8

// `search` (nome/descrição) é resolvido pelo backend contra TODOS os
// setores da empresa, não só a página carregada — GET /sectors?search= (ver
// sectors.repository.js). Mesmo padrão já usado em Postos de Controle.
export function useSectorsData({ page, search }) {
  const [state, setState] = useState({ isLoading: true, error: null, sectors: [], pagination: null })

  const load = useCallback(async () => {
    setState((s) => ({ ...s, isLoading: true, error: null }))
    try {
      const { data } = await api.get('/sectors', {
        params: { page, limit: PAGE_SIZE, search: search?.trim() || undefined },
      })
      setState({ isLoading: false, error: null, sectors: data.data, pagination: data.pagination })
    } catch (err) {
      setState({ isLoading: false, error: err, sectors: [], pagination: null })
    }
  }, [page, search])

  useEffect(() => {
    load()
  }, [load])

  return { ...state, refetch: load }
}
