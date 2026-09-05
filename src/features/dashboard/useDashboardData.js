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

function byId(records) {
  return new Map(records.map((record) => [record.id, record]))
}

/**
 * Não existe endpoint de agregação no backend (nenhum /dashboard, /stats etc.) —
 * tudo aqui é calculado no cliente a partir dos endpoints de listagem que já
 * existem. Onde a lista tem mais de 100 registros (limite máximo por página da
 * API), a amostra buscada (só a primeira página) fica incompleta e os números
 * derivados dela (pessoas/veículos bloqueados, novos cadastros na semana,
 * atividade semanal, acessos por posto) sub-contam — aceitável para o volume
 * de dados atual do projeto (ver memoria.md), documentado aqui e sinalizado
 * via `isPartial` pros cartões que dependem disso.
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
      const weekStart = addDays(todayStart, -6)

      try {
        const [weekRes, todayRes, yesterdayRes, peopleRes, vehiclesRes, sectorsRes, gatesRes, onTripRes] =
          await Promise.all([
            api.get('/access-logs', {
              params: { from: weekStart.toISOString(), to: now.toISOString(), limit: 100 },
            }),
            api.get('/access-logs', {
              params: { from: todayStart.toISOString(), to: tomorrowStart.toISOString(), limit: 1 },
            }),
            api.get('/access-logs', {
              params: { from: yesterdayStart.toISOString(), to: todayStart.toISOString(), limit: 1 },
            }),
            api.get('/people', { params: { limit: 100 } }),
            api.get('/vehicles', { params: { limit: 100 } }),
            api.get('/sectors', { params: { limit: 100 } }),
            api.get('/gates', { params: { limit: 100 } }),
            api.get('/fleet-logs/on-trip'),
          ])
        if (cancelled) return

        const people = peopleRes.data.data
        const vehicles = vehiclesRes.data.data
        const peopleTotal = peopleRes.data.pagination.total
        const vehiclesTotal = vehiclesRes.data.pagination.total
        const peopleSamplePartial = peopleTotal > people.length
        const vehiclesSamplePartial = vehiclesTotal > vehicles.length

        const todayCount = todayRes.data.pagination.total
        const yesterdayCount = yesterdayRes.data.pagination.total
        const todayTrendPct =
          yesterdayCount === 0 ? null : Math.round(((todayCount - yesterdayCount) / yesterdayCount) * 100)

        const newPeopleThisWeek = peopleSamplePartial
          ? null
          : people.filter((person) => new Date(person.createdAt) >= weekStart).length

        const blockedPeopleCount = people.filter((person) => person.isBlocked).length
        const blockedVehiclesCount = vehicles.filter((vehicle) => vehicle.isBlocked).length

        const gatesList = gatesRes.data.data
        // weekLogs já vem ordenado por entry_time desc (access-logs.repository.js)
        // — os 5 primeiros são, por construção, os acessos mais recentes.
        const weekLogs = weekRes.data.data

        setState({
          isLoading: false,
          error: null,
          data: {
            todayCount,
            todayTrendPct,
            vehiclesOnTripCount: onTripRes.data.data.length,
            peopleTotal,
            newPeopleThisWeek,
            alertsCount: blockedPeopleCount + blockedVehiclesCount,
            alertsIsPartial: peopleSamplePartial || vehiclesSamplePartial,
            recentLogs: weekLogs.slice(0, 5),
            weekLogs,
            weekLogsIsPartial: weekRes.data.pagination.total > weekLogs.length,
            peopleById: byId(people),
            vehiclesById: byId(vehicles),
            sectorsById: byId(sectorsRes.data.data),
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
