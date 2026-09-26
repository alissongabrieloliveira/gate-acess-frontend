import { useEffect, useState } from 'react'
import { api } from '../../lib/api'

export const WEEKDAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

// 1=Visitante, 2=Prestador, 3=Funcionário — gate_schema.sql / people.service.js.
export const PERSON_TYPE_LABELS = { 1: 'Visitante', 2: 'Prestador', 3: 'Funcionário' }

export function startOfDay(date) {
  const start = new Date(date)
  start.setHours(0, 0, 0, 0)
  return start
}

export function addDays(date, days) {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

// Chave do dia no fuso do navegador — mesmo formato que o backend devolve em
// /dashboard/summary (agrupado pelo fuso enviado em `timeZone`).
export function toDateKey(date) {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

export function weekStartOf(date) {
  return addDays(startOfDay(date), -6)
}

function byId(records) {
  return new Map(records.map((record) => [record.id, record]))
}

const RECENT_LOGS_LIMIT = 5

/**
 * Contagens vêm do banco (totais das listagens com limit=1 e
 * /dashboard/summary) — nada é contado sobre amostra. Setores/postos ainda
 * vêm de uma lista de até 100 (volume baixo).
 */
export function useDashboardData() {
  const [state, setState] = useState({ isLoading: true, error: null, data: null })

  useEffect(() => {
    let cancelled = false

    async function load() {
      const now = new Date()
      const todayStart = startOfDay(now)
      const tomorrowStart = addDays(todayStart, 1)
      const yesterdayStart = addDays(todayStart, -1)
      const weekStart = weekStartOf(now)

      try {
        const [summaryRes, todayRes, yesterdayRes, peopleRes, gatesRes, onTripRes] = await Promise.all([
          api.get('/dashboard/summary', {
            params: {
              from: weekStart.toISOString(),
              timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            },
          }),
          api.get('/access-logs', {
            params: { from: todayStart.toISOString(), to: tomorrowStart.toISOString(), limit: 1 },
          }),
          api.get('/access-logs', {
            params: { from: yesterdayStart.toISOString(), to: todayStart.toISOString(), limit: 1 },
          }),
          api.get('/people', { params: { limit: 1 } }),
          api.get('/gates', { params: { limit: 100 } }),
          api.get('/fleet-logs/on-trip'),
        ])
        if (cancelled) return

        const summary = summaryRes.data
        const todayCount = todayRes.data.pagination.total
        const yesterdayCount = yesterdayRes.data.pagination.total
        const todayTrendPct =
          yesterdayCount === 0 ? null : Math.round(((todayCount - yesterdayCount) / yesterdayCount) * 100)
        const gatesList = gatesRes.data.data

        setState({
          isLoading: false,
          error: null,
          data: {
            todayCount,
            todayTrendPct,
            vehiclesOnTripCount: onTripRes.data.data.length,
            peopleTotal: peopleRes.data.pagination.total,
            newPeopleThisWeek: summary.newPeople,
            alertsCount: summary.blockedPeople + summary.blockedVehicles,
            accessesByDay: summary.accessesByDay,
            gatesById: byId(gatesList),
            gatesList,
          },
        })
      } catch (err) {
        if (!cancelled) setState({ isLoading: false, error: err, data: null })
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  return state
}

/**
 * Últimos acessos dos 7 dias, filtrados no servidor pelo posto escolhido
 * (antes filtrava uma amostra de 100 no cliente e podia sumir com acessos
 * de postos menos movimentados). Mantém a lista anterior enquanto carrega.
 */
export function useRecentAccessLogs(selectedGateId) {
  const [logs, setLogs] = useState([])

  useEffect(() => {
    let cancelled = false
    const params = { from: weekStartOf(new Date()).toISOString(), limit: RECENT_LOGS_LIMIT }
    if (selectedGateId !== 'all') params.entryGateId = selectedGateId

    api
      .get('/access-logs', { params })
      .then((res) => {
        if (!cancelled) setLogs(res.data.data)
      })
      .catch(() => {
        // Falha aqui não derruba o Dashboard inteiro; a lista fica como estava.
      })
    return () => {
      cancelled = true
    }
  }, [selectedGateId])

  return logs
}
