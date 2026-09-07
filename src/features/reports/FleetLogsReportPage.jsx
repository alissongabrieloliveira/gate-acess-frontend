import { ChevronDown, Eye, Search } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { formatPlateInput } from '../../lib/format'
import { PAGE_SIZE, useFleetLogsReportData } from './useFleetLogsReportData'

const STATUS_BADGES = {
  ON_TRIP: { label: 'Na Rua', className: 'bg-green-100 text-green-700' },
  RETURNED: { label: 'Retornado', className: 'bg-gray-100 text-gray-600' },
}

const STATUS_OPTIONS = [
  { value: 'ON_TRIP', label: 'Na Rua' },
  { value: 'RETURNED', label: 'Retornado' },
]

const selectClass =
  'appearance-none rounded-[10px] border border-gray-200 bg-white py-2.5 pl-3.5 pr-8 text-sm font-medium text-ink focus:border-brand focus:outline-none'

function Select({ value, onChange, children }) {
  return (
    <div className="relative">
      <select value={value} onChange={onChange} className={selectClass}>
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted" />
    </div>
  )
}

function formatDateTime(value) {
  if (!value) return '----'
  return new Date(value).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function FleetLogsReportPage() {
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [searchText, setSearchText] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchText), 400)
    return () => clearTimeout(timer)
  }, [searchText])

  useEffect(() => {
    setPage(1)
  }, [status, from, to, debouncedSearch])

  const { isLoading, error, logs, lookupsError, pagination } = useFleetLogsReportData({
    page,
    status,
    from: from || undefined,
    to: to ? `${to}T23:59:59.999` : undefined,
    search: debouncedSearch,
  })

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-ink">Frota</h1>
        <p className="text-sm text-muted">Histórico de saídas e retornos de veículos da própria frota por período.</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex w-[260px] items-center gap-2 rounded-[10px] border border-gray-200 bg-white px-3.5 py-2.5 shadow-sm">
          <Search className="size-4 shrink-0 text-subtle" strokeWidth={2} />
          <input
            type="text"
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            placeholder="Buscar por placa, motorista ou destino"
            className="w-full text-sm text-ink placeholder:text-subtle focus:outline-none"
          />
        </div>

        <Select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Todos os status</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </Select>

        <input
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          className="rounded-[10px] border border-gray-200 bg-white px-3.5 py-2 text-sm text-ink focus:border-brand focus:outline-none"
        />
        <span className="text-sm text-subtle">até</span>
        <input
          type="date"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          className="rounded-[10px] border border-gray-200 bg-white px-3.5 py-2 text-sm text-ink focus:border-brand focus:outline-none"
        />
      </div>

      {(error || lookupsError) && (
        <p className="text-sm text-red-600">
          Não foi possível carregar o relatório de frota. Tente novamente mais tarde.
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
          <p className="w-[80px] text-center">Detalhe</p>
        </div>

        {isLoading ? (
          <p className="px-5 py-8 text-sm text-muted">Carregando...</p>
        ) : logs.length === 0 ? (
          <p className="px-5 py-8 text-sm text-muted">Nenhum registro de frota encontrado para os filtros selecionados.</p>
        ) : (
          logs.map((log) => {
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
                <p className="w-[120px] text-center text-sm text-subtle">{formatDateTime(log.returnTime)}</p>
                <div className="flex w-[100px] items-center justify-center">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${badge.className}`}>{badge.label}</span>
                </div>
                <div className="flex w-[80px] items-center justify-center">
                  <Link
                    to={`/fleet/${log.id}`}
                    title="Ver detalhes"
                    className="flex size-8 items-center justify-center rounded-lg border border-gray-200 bg-white hover:bg-gray-50"
                  >
                    <Eye className="size-4 text-gray-600" strokeWidth={1.75} />
                  </Link>
                </div>
              </div>
            )
          })
        )}

        <div className="flex items-center justify-between border-t border-gray-200 bg-canvas px-5 py-3.5">
          <p className="text-[13px] text-muted">
            {pagination ? `Mostrando ${logs.length} de ${pagination.total} registros` : ''}
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
    </div>
  )
}
