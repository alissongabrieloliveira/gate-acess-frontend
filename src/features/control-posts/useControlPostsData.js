import { useCallback, useEffect, useState } from 'react'
import { api } from '../../lib/api'

export const PAGE_SIZE = 8

// `search` (nome/descrição) é resolvido pelo backend contra TODOS os
// portões da empresa, não só a página carregada — GET /gates?search= (ver
// gates.repository.js). Mesmo padrão já usado em Pessoas/Veículos/
// Controle de Acessos/Controle de Frota/Usuários.
export function useControlPostsData({ page, search }) {
  const [state, setState] = useState({ isLoading: true, error: null, gates: [], pagination: null })

  const load = useCallback(async () => {
    setState((s) => ({ ...s, isLoading: true, error: null }))
    try {
      const { data } = await api.get('/gates', {
        params: { page, limit: PAGE_SIZE, search: search?.trim() || undefined },
      })
      setState({ isLoading: false, error: null, gates: data.data, pagination: data.pagination })
    } catch (err) {
      setState({ isLoading: false, error: err, gates: [], pagination: null })
    }
  }, [page, search])

  useEffect(() => {
    load()
  }, [load])

  return { ...state, refetch: load }
}
