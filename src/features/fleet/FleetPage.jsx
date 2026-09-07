import { Eye, LogIn, Plus, Search } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import TopBar from '../../components/TopBar'
import { formatPlateInput } from '../../lib/format'
import DepartureDrawer from './DepartureDrawer'
import ReturnDrawer from './ReturnDrawer'
import { enrichFleetLog, PAGE_SIZE, useFleetData } from './useFleetData'

const STATUS_BADGES = {
  ON_TRIP: { label: 'Na Rua', className: 'bg-green-100 text-green-700' },
  RETURNED: { label: 'Retornado', className: 'bg-gray-100 text-gray-600' },
}

const FILTERS = [
  { key: 'ON_TRIP', label: 'Na Rua' },
  { key: 'RETURNED', label: 'Retornado' },
  { key: null, label: 'Todos' },
]

function formatDateTime(value) {
  if (!value) return '----'
  const date = new Date(value)
  const today = new Date()
  const isToday = date.toDateString() === today.toDateString()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  const isYesterday = date.toDateString() === yesterday.toDateString()
  const time = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  if (isToday) return `Hoje, ${time}`
  if (isYesterday) return `Ontem, ${time}`
  return `${date.toLocaleDateString('pt-BR')}, ${time}`
}

export default function FleetPage() {
  const [statusFilter, setStatusFilter] = useState('ON_TRIP')
  const [page, setPage] = useState(1)
  const [selectedGateId, setSelectedGateId] = useState('all')
  const [searchText, setSearchText] = useState('')
  // Busca com debounce contra o backend (GET /fleet-logs?search=), que
  // filtra TODOS os registros da empresa, não só a página já carregada no
  // cliente — mesmo ajuste já feito em Pessoas/Veículos/Controle de Acessos.
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [isDepartureOpen, setIsDepartureOpen] = useState(false)
  const [returningLog, setReturningLog] = useState(null)

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchText), 400)
    return () => clearTimeout(timer)
  }, [searchText])

  useEffect(() => {
    setPage(1)
  }, [debouncedSearch])

  const { lookups, lookupsError, counts, logs, pagination, isLoading, error, refetch } = useFleetData({
    status: statusFilter,
    page,
    search: debouncedSearch,
  })

  // Filtro por texto não roda mais aqui — o backend já devolve a página
  // filtrada (?search=). Isso só resolve placa/motorista/portão a partir
  // dos IDs pra exibição.
  const enrichedLogs = useMemo(() => {
    if (!lookups) return []
    return logs.map((log) => enrichFleetLog(log, lookups))
  }, [logs, lookups])

  function changeFilter(key) {
    setStatusFilter(key)
    setPage(1)
  }

  return (
    <div className="flex flex-col gap-6">
      <TopBar
        title="Controle de Frota"
        gates={lookups?.gatesList ?? []}
        selectedGateId={selectedGateId}
        onGateChange={setSelectedGateId}
      />

      <div className="flex items-center gap-3">
        <div className="flex w-[280px] items-center gap-2 rounded-[10px] border border-gray-200 bg-white px-3.5 py-2.5 shadow-sm">
          <Search className="size-4 shrink-0 text-subtle" strokeWidth={2} />
          <input
            type="text"
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            placeholder="Buscar por placa, motorista ou destino"
            className="w-full text-sm text-ink placeholder:text-subtle focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          {FILTERS.map((filter) => {
            const isActive = statusFilter === filter.key
            const count = filter.key === 'ON_TRIP' ? counts.onTrip : filter.key === 'RETURNED' ? counts.returned : counts.total
            return (
              <button
                key={filter.label}
                type="button"
                onClick={() => changeFilter(filter.key)}
                className={`rounded-[10px] px-3.5 py-2 text-[13px] font-semibold ${
                  isActive ? 'bg-brand text-brand-50' : 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                {filter.label}
                {count !== null && ` (${count})`}
              </button>
            )
          })}
        </div>

        <div className="flex-1" />

        <button
          type="button"
          onClick={() => setIsDepartureOpen(true)}
          disabled={!lookups}
          className="flex items-center gap-1.5 rounded-[10px] bg-brand px-4 py-2.5 text-sm font-bold text-white hover:opacity-90 disabled:opacity-50"
        >
          <Plus className="size-4" strokeWidth={2.5} />
          Registrar Saída
        </button>
      </div>

      {(error || lookupsError) && (
        <p className="text-sm text-red-600">
          Não foi possível carregar os dados de controle de frota. Tente novamente mais tarde.
        </p>
      )}

      <div className="flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="flex justify-between bg-canvas px-5 py-3 text-xs font-bold uppercase text-muted">
          <p className="w-[180px]">Veículo</p>
          <p className="w-[150px] text-center">Motorista</p>
          <p className="w-[160px] text-center">Destino</p>
          <p className="w-[120px] text-center">Saída</p>
          <p className="w-[120px] text-center">Retorno</p>
          <p className="w-[100px] text-center">Status</p>
          <p className="w-[90px] text-center">Ações</p>
        </div>
        {/* w-[90px] cabe até 2 ícones (Ver Detalhes sempre, Registrar Retorno só
            quando ON_TRIP) — mesma conta já usada em Controle de Acessos: 2×32px
            + 8px de gap = 72px, com folga dentro dos 90px. */}

        {isLoading || !lookups ? (
          <p className="px-5 py-8 text-sm text-muted">Carregando...</p>
        ) : enrichedLogs.length === 0 ? (
          <p className="px-5 py-8 text-sm text-muted">Nenhum registro de frota encontrado.</p>
        ) : (
          enrichedLogs.map((log) => {
            const badge = STATUS_BADGES[log.status] ?? { label: log.status, className: 'bg-gray-100 text-gray-700' }
            return (
              <div key={log.id} className="flex items-center justify-between border-t border-gray-200 px-5 py-3.5">
                <div className="flex w-[180px] flex-col gap-0.5">
                  <p className="truncate text-sm font-bold text-ink">
                    {log.vehiclePlate ? formatPlateInput(log.vehiclePlate) : '—'}
                  </p>
                  <p className="truncate text-[11px] text-gray-500">{log.vehicleLabel ?? '—'}</p>
                </div>
                <p className="w-[150px] truncate text-center text-sm text-gray-700">{log.driverName ?? '—'}</p>
                <p className="w-[160px] truncate text-center text-sm text-gray-700">{log.destination ?? '—'}</p>
                <p className="w-[120px] text-center text-sm text-gray-700">{formatDateTime(log.departureTime)}</p>
                <p className="w-[120px] text-center text-sm text-subtle">
                  {log.returnTime ? formatDateTime(log.returnTime) : '----'}
                </p>
                <div className="flex w-[100px] items-center justify-center">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${badge.className}`}>{badge.label}</span>
                </div>
                <div className="flex w-[90px] items-center justify-center gap-2">
                  <Link
                    to={`/fleet/${log.id}`}
                    title="Ver detalhes"
                    className="flex size-8 items-center justify-center rounded-lg border border-gray-200 bg-white hover:bg-gray-50"
                  >
                    <Eye className="size-4 text-gray-600" strokeWidth={1.75} />
                  </Link>
                  {log.status === 'ON_TRIP' && (
                    <button
                      type="button"
                      title="Registrar retorno"
                      onClick={() => setReturningLog(log)}
                      className="flex size-8 items-center justify-center rounded-lg border border-gray-200 bg-white hover:bg-gray-50"
                    >
                      <LogIn className="size-4 text-gray-600" strokeWidth={1.75} />
                    </button>
                  )}
                </div>
              </div>
            )
          })
        )}

        <div className="flex items-center justify-between border-t border-gray-200 bg-canvas px-5 py-3.5">
          <p className="text-[13px] text-muted">
            {pagination ? `Mostrando ${enrichedLogs.length} de ${pagination.total} registros` : ''}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="rounded-[10px] border border-gray-200 bg-white px-4 py-2 text-[13px] font-semibold text-gray-700 disabled:opacity-40"
            >
              Anterior
            </button>
            <button
              type="button"
              disabled={!pagination || page * PAGE_SIZE >= pagination.total}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-[10px] bg-brand px-4 py-2 text-[13px] font-semibold text-white disabled:opacity-40"
            >
              Próxima
            </button>
          </div>
        </div>
      </div>

      {isDepartureOpen && lookups && (
        <DepartureDrawer
          lookups={lookups}
          defaultGateId={selectedGateId !== 'all' ? selectedGateId : undefined}
          onClose={() => setIsDepartureOpen(false)}
          onCreated={() => {
            setIsDepartureOpen(false)
            changeFilter('ON_TRIP')
            refetch()
          }}
        />
      )}

      {returningLog && (
        <ReturnDrawer
          logId={returningLog.id}
          vehiclePlate={returningLog.vehiclePlate}
          vehicleLabel={returningLog.vehicleLabel}
          driverName={returningLog.driverName}
          destination={returningLog.destination}
          purpose={returningLog.purpose}
          towPlate={returningLog.towPlate}
          departureTime={returningLog.departureTime}
          defaultGateId={selectedGateId !== 'all' ? selectedGateId : lookups?.gatesList[0]?.id}
          onClose={() => setReturningLog(null)}
          onReturned={() => {
            setReturningLog(null)
            refetch()
          }}
        />
      )}
    </div>
  )
}
