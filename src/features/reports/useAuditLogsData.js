import { useCallback, useEffect, useState } from 'react'
import { api } from '../../lib/api'

export const PAGE_SIZE = 8

// Só as tabelas que realmente têm trigger de auditoria (trg_audit_*) — ver
// migrations 20260903190500 a 20260903190900. `users`/`companies` não geram
// audit_logs de propósito (comentário em audit-logs.service.js: LGPD, não
// duplicar PII em claro na trilha).
export const AUDITED_TABLES = [
  { value: 'people', label: 'Pessoas' },
  { value: 'vehicles', label: 'Veículos' },
  { value: 'gates', label: 'Postos de Controle' },
  { value: 'sectors', label: 'Setores' },
  { value: 'access_logs', label: 'Controle de Acessos' },
  { value: 'fleet_logs', label: 'Controle de Frota' },
]

export const TABLE_LABELS = Object.fromEntries(AUDITED_TABLES.map((t) => [t.value, t.label]))

export const ACTIONS = [
  { value: 'INSERT', label: 'Criação' },
  { value: 'UPDATE', label: 'Atualização' },
  { value: 'DELETE', label: 'Exclusão' },
]

export const ACTION_LABELS = Object.fromEntries(ACTIONS.map((a) => [a.value, a.label]))

// Usuário (quem fez a alteração) só vem como ID no audit_logs — resolvido
// aqui a partir de uma lista de usuários da empresa, mesmo padrão de
// "lookups" já usado em Controle de Acessos/Frota pra placa/pessoa/portão.
export function useAuditLogsData({ page, tableName, action, userId, from, to }) {
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
      const { data } = await api.get('/audit-logs', {
        params: {
          page,
          limit: PAGE_SIZE,
          tableName: tableName || undefined,
          action: action || undefined,
          userId: userId || undefined,
          from: from || undefined,
          to: to || undefined,
        },
      })
      setState({ isLoading: false, error: null, logs: data.data, pagination: data.pagination })
    } catch (err) {
      setState({ isLoading: false, error: err, logs: [], pagination: null })
    }
  }, [page, tableName, action, userId, from, to])

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
