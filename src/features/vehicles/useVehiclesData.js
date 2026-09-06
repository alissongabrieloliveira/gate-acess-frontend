import { useCallback, useEffect, useState } from 'react'
import { api } from '../../lib/api'

export const PAGE_SIZE = 8

export function useVehiclesData({ page }) {
  const [state, setState] = useState({ isLoading: true, error: null, vehicles: [], pagination: null })

  const load = useCallback(async () => {
    setState((s) => ({ ...s, isLoading: true, error: null }))
    try {
      const { data } = await api.get('/vehicles', { params: { page, limit: PAGE_SIZE } })
      setState({ isLoading: false, error: null, vehicles: data.data, pagination: data.pagination })
    } catch (err) {
      setState({ isLoading: false, error: err, vehicles: [], pagination: null })
    }
  }, [page])

  useEffect(() => {
    load()
  }, [load])

  return { ...state, refetch: load }
}
