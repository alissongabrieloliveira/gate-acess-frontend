import { useCallback, useEffect, useState } from 'react'
import { api } from '../../lib/api'

/**
 * Mesmo padrão de `useAccessLogDetail`: diferente da listagem (que resolve
 * placa/motorista contra uma amostra paginada de até 100 registros por
 * cadastro), aqui busca exatamente os registros relacionados por ID — sem
 * limitação de amostra parcial, já que é só um detalhe por vez.
 */
export function useFleetLogDetail(id) {
  const [state, setState] = useState({ isLoading: true, error: null, detail: null })

  const load = useCallback(async () => {
    setState((s) => ({ ...s, isLoading: true, error: null }))
    try {
      const { data: log } = await api.get(`/fleet-logs/${id}`)

      const [vehicle, driver, transportingVehicle, departureGate, returnGate] = await Promise.all([
        api.get(`/vehicles/${log.vehicleId}`).then((r) => r.data),
        log.driverId ? api.get(`/people/${log.driverId}`).then((r) => r.data) : null,
        log.transportingVehicleId ? api.get(`/vehicles/${log.transportingVehicleId}`).then((r) => r.data) : null,
        api.get(`/gates/${log.departureGateId}`).then((r) => r.data),
        log.returnGateId ? api.get(`/gates/${log.returnGateId}`).then((r) => r.data) : null,
      ])

      setState({
        isLoading: false,
        error: null,
        detail: { log, vehicle, driver, transportingVehicle, departureGate, returnGate },
      })
    } catch (err) {
      setState({ isLoading: false, error: err, detail: null })
    }
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  return { ...state, refetch: load }
}
