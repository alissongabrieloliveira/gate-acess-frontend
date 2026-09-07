import { useCallback, useEffect, useState } from 'react'
import { api } from '../../lib/api'

export const PAGE_SIZE = 8

// 1=Visitante, 2=Frota Própria, 3=Colaborador, 4=Prestador de Serviço —
// definido pelo usuário (backend/src/modules/vehicles/vehicles.service.js).
export const VEHICLE_TYPE_LABELS = {
  1: 'Visitante',
  2: 'Frota Própria',
  3: 'Colaborador',
  4: 'Prestador de Serviço',
}
export const VEHICLE_TYPES = [
  { value: 1, label: 'Visitante' },
  { value: 2, label: 'Frota Própria' },
  { value: 3, label: 'Colaborador' },
  { value: 4, label: 'Prestador de Serviço' },
]

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
