import { useCallback, useEffect, useState } from 'react'
import { api } from '../../lib/api'
import { useAuth } from '../../lib/auth'

/**
 * GET /companies/me é o único endpoint do backend sem DTO camelCase (o
 * controller devolve a linha crua do Knex) — os campos aqui vêm em
 * snake_case (corporate_name, contact_email etc.), diferente de /users/:id.
 */
export function useSettingsData() {
  const { user } = useAuth()
  const [state, setState] = useState({ isLoading: true, error: null, profile: null, company: null })

  const load = useCallback(async () => {
    if (!user) return
    setState((s) => ({ ...s, isLoading: true, error: null }))
    try {
      const [profile, company] = await Promise.all([
        api.get(`/users/${user.userId}`).then((r) => r.data),
        api.get('/companies/me').then((r) => r.data),
      ])
      setState({ isLoading: false, error: null, profile, company })
    } catch (err) {
      setState({ isLoading: false, error: err, profile: null, company: null })
    }
  }, [user])

  useEffect(() => {
    load()
  }, [load])

  return { ...state, refetch: load }
}
