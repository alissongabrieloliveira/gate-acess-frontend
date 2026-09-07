import { useCallback, useEffect, useState } from 'react'
import { api } from '../../lib/api'

export const PAGE_SIZE = 8

// 1=Visitante, 2=Prestador, 3=Funcionário (backend/src/modules/people/people.service.js).
export const PERSON_TYPE_LABELS = { 1: 'Visitante', 2: 'Prestador', 3: 'Funcionário' }
export const PERSON_TYPES = [
  { value: 1, label: 'Visitante' },
  { value: 2, label: 'Prestador' },
  { value: 3, label: 'Funcionário' },
]

export function usePeopleData({ page }) {
  const [state, setState] = useState({ isLoading: true, error: null, people: [], pagination: null })

  const load = useCallback(async () => {
    setState((s) => ({ ...s, isLoading: true, error: null }))
    try {
      const { data } = await api.get('/people', { params: { page, limit: PAGE_SIZE } })
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
