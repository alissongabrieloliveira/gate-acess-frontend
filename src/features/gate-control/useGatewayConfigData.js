import { useCallback, useEffect, useState } from 'react'
import { api } from '../../lib/api'

// GET /gateway-config é admin-only (backend) — só a tela de diagnóstico
// (GateControlPage, já restrita a isAdmin) usa este hook.
export function useGatewayConfigData() {
  const [state, setState] = useState({ isLoading: true, error: null, device: null, outputs: [] })

  const load = useCallback(async () => {
    setState((s) => ({ ...s, isLoading: true, error: null }))
    try {
      const { data } = await api.get('/gateway-config')
      setState({ isLoading: false, error: null, device: data.device, outputs: data.outputs })
    } catch (err) {
      setState({ isLoading: false, error: err, device: null, outputs: [] })
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  return { ...state, refetch: load }
}
