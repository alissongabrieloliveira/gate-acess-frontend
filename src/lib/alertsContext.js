import { createContext, createElement, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { api } from './api'
import { buildAlertItems } from './alerts'
import { useAuth } from './auth'
import { RULES } from './rules'

const REFRESH_INTERVAL_MS = 60 * 1000

const AlertsContext = createContext(null)

/**
 * Uma única busca de GET /dashboard/alerts para o app inteiro (sininho em
 * várias telas), refeita a cada minuto e quando a aba
 * volta a ficar visível. Fica no Layout, ou seja, só com usuário logado.
 */
export function AlertsProvider({ children }) {
  const { user } = useAuth()
  const isAdmin = !!(user?.rules & RULES.ADMIN)
  const [state, setState] = useState({ data: null, error: null })

  const refresh = useCallback(() => {
    return api
      .get('/dashboard/alerts')
      .then(({ data }) => setState({ data, error: null }))
      .catch((error) => setState((current) => ({ ...current, error })))
  }, [])

  useEffect(() => {
    refresh()
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') refresh()
    }, REFRESH_INTERVAL_MS)
    const onVisible = () => {
      if (document.visibilityState === 'visible') refresh()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [refresh])

  const value = useMemo(() => {
    const items = buildAlertItems(state.data, { isAdmin })
    return {
      items,
      count: items.length,
      thresholds: state.data?.thresholds ?? null,
      isAdmin,
      isLoading: !state.data && !state.error,
      error: state.error,
      refresh,
    }
  }, [state, isAdmin, refresh])

  return createElement(AlertsContext.Provider, { value }, children)
}

export function useAlerts() {
  const context = useContext(AlertsContext)
  if (!context) throw new Error('useAlerts precisa estar dentro de <AlertsProvider>')
  return context
}
