import { AlertTriangle, ArrowUpRight, Truck, Users } from 'lucide-react'
import { useMemo, useState } from 'react'
import TopBar from '../../components/TopBar'
import {
  addDays,
  PERSON_TYPE_LABELS,
  startOfDay,
  useDashboardData,
  WEEKDAY_LABELS,
} from './useDashboardData'

const STATUS_BADGES = {
  ACTIVE: { label: 'Entrada', className: 'bg-green-100 text-green-700' },
  FINISHED: { label: 'Saída', className: 'bg-amber-100 text-amber-700' },
}

const MAX_BAR_HEIGHT = 140

export default function DashboardPage() {
  const { isLoading, error, data } = useDashboardData()
  const [selectedGateId, setSelectedGateId] = useState('all')

  const filteredWeekLogs = useMemo(() => {
    if (!data) return []
    if (selectedGateId === 'all') return data.weekLogs
    return data.weekLogs.filter((log) => String(log.entryGateId) === selectedGateId)
  }, [data, selectedGateId])

  const recentLogs = useMemo(() => {
    if (!data) return []
    const source = selectedGateId === 'all' ? data.recentLogs : filteredWeekLogs.slice(0, 5)
    return source.map((log) => enrichLog(log, data))
  }, [data, filteredWeekLogs, selectedGateId])

  const weeklyBuckets = useMemo(() => {
    if (!data) return []
    const today = startOfDay(new Date())
    const weekStart = addDays(today, -6)
    const counts = Array.from({ length: 7 }, (_, i) => {
      const day = addDays(weekStart, i)
      const nextDay = addDays(day, 1)
      const count = filteredWeekLogs.filter((log) => {
        const entry = new Date(log.entryTime)
        return entry >= day && entry < nextDay
      }).length
      return { label: WEEKDAY_LABELS[day.getDay()], count, isToday: day.getTime() === today.getTime() }
    })
    const max = Math.max(...counts.map((bucket) => bucket.count), 1)
    return counts.map((bucket) => ({ ...bucket, heightPx: Math.max(Math.round((bucket.count / max) * MAX_BAR_HEIGHT), 4) }))
  }, [data, filteredWeekLogs])

  const postsBreakdown = useMemo(() => {
    if (!data) return []
    const countByGate = new Map()
    for (const log of data.weekLogs) {
      countByGate.set(log.entryGateId, (countByGate.get(log.entryGateId) || 0) + 1)
    }
    const total = data.weekLogs.length
    return [...countByGate.entries()]
      .map(([gateId, count]) => ({
        name: data.gatesById.get(gateId)?.name ?? 'Posto removido',
        count,
        pct: total === 0 ? 0 : Math.round((count / total) * 100),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 4)
  }, [data])

  if (isLoading) {
    return null
  }

  if (error) {
    return (
      <p className="text-sm text-red-600">
        Não foi possível carregar os dados do dashboard. Tente novamente mais tarde.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-8">
      <TopBar
        title="Dashboard"
        gates={data.gatesList}
        selectedGateId={selectedGateId}
        onGateChange={setSelectedGateId}
      />

      <div className="grid grid-cols-2 gap-6 lg:grid-cols-4">
        <KpiCard
          label="Acessos Hoje"
          value={data.todayCount}
          icon={<ArrowUpRight className="size-[18px] text-brand" strokeWidth={2} />}
          badge={
            data.todayTrendPct === null
              ? null
              : {
                  text: `${data.todayTrendPct >= 0 ? '+' : ''}${data.todayTrendPct}%`,
                  className: data.todayTrendPct >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700',
                }
          }
        />
        <KpiCard
          label="Veículos Ativos"
          value={data.vehiclesOnTripCount}
          icon={<Truck className="size-[18px] text-brand" strokeWidth={2} />}
          badge={{ text: 'Em operação', className: 'bg-green-100 text-green-700' }}
        />
        <KpiCard
          label="Pessoas Cadastradas"
          value={data.peopleTotal}
          icon={<Users className="size-[18px] text-brand" strokeWidth={2} />}
          badge={
            data.newPeopleThisWeek === null
              ? null
              : { text: `+${data.newPeopleThisWeek}`, className: 'bg-green-100 text-green-700' }
          }
        />
        <KpiCard
          label="Alertas"
          value={data.alertsCount}
          icon={<AlertTriangle className="size-[18px] text-brand" strokeWidth={2} />}
          badge={
            data.alertsCount > 0
              ? { text: 'Crítico', className: 'bg-red-100 text-red-700' }
              : { text: 'Normal', className: 'bg-green-100 text-green-700' }
          }
          title={
            data.alertsIsPartial
              ? 'Calculado a partir de uma amostra parcial — mais de 100 pessoas ou veículos cadastrados'
              : 'Pessoas e veículos bloqueados'
          }
        />
      </div>

      <div className="flex flex-col items-stretch gap-6 lg:flex-row lg:items-start">
        <div className="flex flex-1 flex-col rounded-xl border border-gray-200 bg-white">
          <div className="flex items-center justify-between border-b border-gray-200 p-5">
            <p className="text-base font-bold text-ink">Últimos Acessos</p>
            <span className="text-[13px] font-semibold text-brand">Ver todos os registros</span>
          </div>
          <div className="flex bg-canvas px-4 py-3 text-xs font-bold text-muted">
            <p className="flex-1">Nome</p>
            <p className="w-[120px]">Tipo</p>
            <p className="w-[100px]">Placa</p>
            <p className="w-[100px]">Status</p>
          </div>
          <div className="flex flex-col">
            {recentLogs.length === 0 && (
              <p className="px-4 py-6 text-sm text-muted">Nenhum acesso registrado nos últimos 7 dias.</p>
            )}
            {recentLogs.map((log) => {
              const badge = STATUS_BADGES[log.status] ?? { label: log.status, className: 'bg-gray-100 text-gray-700' }
              return (
                <div key={log.id} className="flex items-center border-b border-gray-200 px-4 py-3.5 last:border-b-0">
                  <div className="flex flex-1 flex-col gap-0.5">
                    <p className="truncate text-sm font-semibold text-ink">{log.name}</p>
                    {log.destination && <p className="text-xs text-muted">Destino: {log.destination}</p>}
                  </div>
                  <p className="w-[120px] text-sm text-muted">{log.type}</p>
                  <p className="w-[100px] text-sm text-muted">{log.plate}</p>
                  <div className="w-[100px]">
                    <span className={`rounded-full px-2 py-1 text-xs font-semibold ${badge.className}`}>
                      {badge.label}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="flex w-full flex-col gap-6 rounded-xl border border-gray-200 bg-white p-6 lg:w-[440px] lg:shrink-0">
          <p className="text-base font-bold text-ink">Atividade Semanal</p>
          <div className="flex flex-col items-center rounded-xl border border-gray-200 bg-canvas p-4">
            <div className="flex h-[180px] w-full items-end justify-between">
              {weeklyBuckets.map((bucket) => (
                <div key={bucket.label} className="flex w-10 flex-col items-center gap-2">
                  <p className="text-[10px] font-semibold text-muted">{bucket.count}</p>
                  <div
                    style={{ height: `${bucket.heightPx}px` }}
                    className={`w-6 rounded-t ${bucket.isToday ? 'bg-brand' : 'bg-brand-50'}`}
                  />
                  <p className="text-xs font-medium text-muted">{bucket.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-6">
        <p className="text-base font-bold text-ink">Acessos por Posto de Controle</p>
        {postsBreakdown.length === 0 ? (
          <p className="text-sm text-muted">Nenhum acesso registrado nos últimos 7 dias.</p>
        ) : (
          <div className="grid grid-cols-2 gap-x-8 gap-y-5 lg:flex lg:items-start">
            {postsBreakdown.map((post) => (
              <div key={post.name} className="flex flex-col gap-1.5 lg:flex-1">
                <div className="flex items-center justify-between text-sm font-semibold">
                  <p className="text-ink">{post.name}</p>
                  <p className="text-muted">
                    {post.count} acessos <span className="font-normal text-subtle">({post.pct}%)</span>
                  </p>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-brand-50">
                  <div className="h-full rounded bg-brand" style={{ width: `${post.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function enrichLog(log, data) {
  const person = data.peopleById.get(log.personId)
  const vehicle = log.vehicleId ? data.vehiclesById.get(log.vehicleId) : null
  const sector = log.destinationSectorId ? data.sectorsById.get(log.destinationSectorId) : null
  return {
    id: log.id,
    status: log.status,
    name: person?.name ?? 'Pessoa não encontrada',
    type: person ? (PERSON_TYPE_LABELS[person.personType] ?? '—') : '—',
    plate: vehicle?.licensePlate ?? '—',
    destination: sector?.name ?? null,
  }
}

function KpiCard({ label, value, icon, badge, title }) {
  return (
    <div title={title} className="flex flex-1 flex-col gap-4 rounded-xl border border-gray-200 bg-white p-6">
      <div className="flex items-center justify-between">
        <p className="text-[13px] font-semibold uppercase text-muted">{label}</p>
        <div className="rounded-lg bg-brand-50 p-2">{icon}</div>
      </div>
      <div className="flex items-baseline gap-3">
        <p className="text-[28px] font-bold text-ink">{value}</p>
        {badge && <span className={`rounded px-1.5 py-0.5 text-[11px] font-bold ${badge.className}`}>{badge.text}</span>}
      </div>
    </div>
  )
}
