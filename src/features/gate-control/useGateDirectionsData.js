import { useCallback, useEffect, useState } from 'react'
import { api } from '../../lib/api'

// Compartilhado entre a tela de diagnóstico (admin) e os botões
// operacionais de Entrada/Saída em Controle de Acessos/Frota — evita
// duplicar o fetch de /gate-directions. Lista pequena (no máximo 2
// direções), sem paginação.
export function useGateDirectionsData() {
  const [state, setState] = useState({ isLoading: true, error: null, rows: [] })

  const load = useCallback(async () => {
    setState((s) => ({ ...s, isLoading: true, error: null }))
    try {
      const { data } = await api.get('/gate-directions')
      setState({ isLoading: false, error: null, rows: data.data })
    } catch (err) {
      setState({ isLoading: false, error: err, rows: [] })
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  return { ...state, refetch: load }
}
