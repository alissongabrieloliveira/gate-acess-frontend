import { useCallback, useEffect, useState } from 'react'
import { api } from '../../lib/api'

export const PAGE_SIZE = 8

// `search` (nome/CPF/e-mail) é resolvido pelo backend contra TODOS os
// usuários da empresa, não só a página carregada — GET /users?search= (ver
// users.service.js) — mesmo padrão já usado em Pessoas/Veículos/Controle de
// Acessos/Controle de Frota, aplicado aqui desde o início.
export function useUsersData({ page, search }) {
  const [state, setState] = useState({ isLoading: true, error: null, users: [], pagination: null })

  const load = useCallback(async () => {
    setState((s) => ({ ...s, isLoading: true, error: null }))
    try {
      const { data } = await api.get('/users', {
        params: { page, limit: PAGE_SIZE, search: search?.trim() || undefined },
      })
      setState({ isLoading: false, error: null, users: data.data, pagination: data.pagination })
    } catch (err) {
      setState({ isLoading: false, error: err, users: [], pagination: null })
    }
  }, [page, search])

  useEffect(() => {
    load()
  }, [load])

  return { ...state, refetch: load }
}
