import { useCallback, useEffect, useState } from 'react'
import { api } from '../../lib/api'

export const PAGE_SIZE = 8

export const STATUS_OPTIONS = [
  { value: 'SUCCESS', label: 'Sucesso' },
  { value: 'FAILED', label: 'Falha' },
]

// Mesmo padrão de useAuditLogsData: login_logs.user_id só vem como ID,
// resolvido aqui contra uma lista de usuários da empresa.
export function useLoginLogsData({ page, userId, status, from, to }) {
  const [usersById, setUsersById] = useState(new Map())
  const [usersList, setUsersList] = useState([])
  const [usersError, setUsersError] = useState(null)
  const [state, setState] = useState({ isLoading: true, error: null, logs: [], pagination: null })

  const loadUsers = useCallback(async () => {
    try {
      const { data } = await api.get('/users', { params: { limit: 100 } })
      setUsersById(new Map(data.data.map((u) => [u.id, u])))
      setUsersList(data.data)
    } catch (err) {
      setUsersError(err)
    }
  }, [])

  const load = useCallback(async () => {
    setState((s) => ({ ...s, isLoading: true, error: null }))
    try {
      const { data } = await api.get('/login-logs', {
        params: {
          page,
          limit: PAGE_SIZE,
          userId: userId || undefined,
          status: status || undefined,
          from: from || undefined,
          to: to || undefined,
        },
      })
      setState({ isLoading: false, error: null, logs: data.data, pagination: data.pagination })
    } catch (err) {
      setState({ isLoading: false, error: err, logs: [], pagination: null })
    }
  }, [page, userId, status, from, to])

  useEffect(() => {
    loadUsers()
  }, [loadUsers])

  useEffect(() => {
    load()
  }, [load])

  const enrichedLogs = state.logs.map((log) => ({
    ...log,
    userName: usersById.get(log.userId)?.name ?? (log.userId ? `Usuário #${log.userId}` : '—'),
  }))

  return { ...state, logs: enrichedLogs, usersList, usersError, refetch: load }
}
