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

// `search` (placa/identificação/marca/modelo) é resolvido pelo backend
// contra TODOS os veículos da empresa, não só a página carregada — GET
// /vehicles?search= (ver vehicles.repository.js). Sem isso, buscar um
// veículo que está na página 2 enquanto o cliente só carregou a página 1
// nunca encontraria nada (mesmo bug já corrigido em Pessoas).
export function useVehiclesData({ page, search }) {
  const [state, setState] = useState({ isLoading: true, error: null, vehicles: [], pagination: null })

  const load = useCallback(async () => {
    setState((s) => ({ ...s, isLoading: true, error: null }))
    try {
      const { data } = await api.get('/vehicles', {
        params: { page, limit: PAGE_SIZE, search: search?.trim() || undefined },
      })
      setState({ isLoading: false, error: null, vehicles: data.data, pagination: data.pagination })
    } catch (err) {
      setState({ isLoading: false, error: err, vehicles: [], pagination: null })
    }
  }, [page, search])

  useEffect(() => {
    load()
  }, [load])

  return { ...state, refetch: load }
}
