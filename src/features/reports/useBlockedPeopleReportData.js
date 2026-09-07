import { useCallback, useEffect, useState } from 'react'
import { api } from '../../lib/api'

export const PAGE_SIZE = 8

// GET /people?blocked=true (novo filtro em people.service.js/
// people.repository.js — is_blocked não é criptografado, filtra direto no
// banco, sem precisar do caminho "decripta tudo" usado por ?search=).
// Ação de bloquear/desbloquear já existe em Pessoas — este relatório é só
// leitura, focado em "quem está bloqueado e por quê" (dado de segurança).
export function useBlockedPeopleReportData({ page }) {
  const [state, setState] = useState({ isLoading: true, error: null, people: [], pagination: null })

  const load = useCallback(async () => {
    setState((s) => ({ ...s, isLoading: true, error: null }))
    try {
      const { data } = await api.get('/people', {
        params: { page, limit: PAGE_SIZE, blocked: true },
      })
      setState({ isLoading: false, error: null, people: data.data, pagination: data.pagination })
    } catch (err) {
      setState({ isLoading: false, error: err, people: [], pagination: null })
    }
  }, [page])

  useEffect(() => {
    load()
  }, [load])

  return { ...state, refetch: load }
}
