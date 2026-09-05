import { useCallback, useEffect, useState } from 'react'
import { api } from '../../lib/api'

/**
 * Diferente da listagem (que resolve nomes contra uma amostra paginada de até
 * 100 registros por cadastro), aqui buscamos exatamente os registros
 * relacionados por ID — sem limitação de amostra parcial, já que é só um
 * detalhe por vez.
 */
export function useAccessLogDetail(id) {
  const [state, setState] = useState({ isLoading: true, error: null, detail: null })

  const load = useCallback(async () => {
    setState((s) => ({ ...s, isLoading: true, error: null }))
    try {
      const { data: log } = await api.get(`/access-logs/${id}`)

      const [person, visitedPerson, vehicle, sector, entryGate, exitGate] = await Promise.all([
        api.get(`/people/${log.personId}`).then((r) => r.data),
        log.visitedPersonId ? api.get(`/people/${log.visitedPersonId}`).then((r) => r.data) : null,
        log.vehicleId ? api.get(`/vehicles/${log.vehicleId}`).then((r) => r.data) : null,
        log.destinationSectorId ? api.get(`/sectors/${log.destinationSectorId}`).then((r) => r.data) : null,
        api.get(`/gates/${log.entryGateId}`).then((r) => r.data),
        log.exitGateId ? api.get(`/gates/${log.exitGateId}`).then((r) => r.data) : null,
      ])

      setState({ isLoading: false, error: null, detail: { log, person, visitedPerson, vehicle, sector, entryGate, exitGate } })
    } catch (err) {
      setState({ isLoading: false, error: err, detail: null })
    }
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  return { ...state, refetch: load }
}
