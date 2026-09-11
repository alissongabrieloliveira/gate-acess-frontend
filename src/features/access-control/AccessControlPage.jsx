import { Eye, LogOut, Plus, Printer, Search } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import TopBar from '../../components/TopBar'
import { formatCpf, formatPlateInput } from '../../lib/format'
import ExitDrawer from './ExitDrawer'
import NewEntryDrawer from './NewEntryDrawer'
import { enrichLog, PAGE_SIZE, useAccessControlData } from './useAccessControlData'
import { printReceipt } from './printReceipt'

const STATUS_BADGES = {
  ACTIVE: { label: 'Ativo', className: 'bg-green-100 text-green-700' },
  FINISHED: { label: 'Finalizado', className: 'bg-gray-100 text-gray-600' },
}

const FILTERS = [
  { key: 'ACTIVE', label: 'Dentro da Empresa' },
  { key: 'FINISHED', label: 'Finalizado' },
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

export default function AccessControlPage() {
  const [statusFilter, setStatusFilter] = useState('ACTIVE')
  const [page, setPage] = useState(1)
  const [selectedGateId, setSelectedGateId] = useState('all')
  const [searchText, setSearchText] = useState('')
  // Busca com debounce contra o backend (GET /access-logs?search=), que
  // filtra TODOS os registros da empresa, não só a página já carregada no
  // cliente — mesmo ajuste já feito em Pessoas/Veículos (buscar um registro
  // da página 2 enquanto a tela mostrava a página 1 nunca encontrava nada).
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [isNewEntryOpen, setIsNewEntryOpen] = useState(false)
  const [exitingLog, setExitingLog] = useState(null)

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchText), 400)
    return () => clearTimeout(timer)
  }, [searchText])

  useEffect(() => {
    setPage(1)
  }, [debouncedSearch])

  const { lookups, lookupsError, counts, logs, pagination, isLoading, error, refetch } = useAccessControlData({
    status: statusFilter,
    page,
    search: debouncedSearch,
  })

  // Filtro por texto não roda mais aqui — o backend já devolve a página
  // filtrada (?search=). Isso só resolve nome/placa/anfitrião a partir dos
  // IDs pra exibição.
  const enrichedLogs = useMemo(() => {
    if (!lookups) return []
    return logs.map((log) => enrichLog(log, lookups))
  }, [logs, lookups])

  function changeFilter(key) {
    setStatusFilter(key)
    setPage(1)
  }

  return (
    <div className="flex flex-col gap-6">
      <TopBar
        title="Controle de Acessos"
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
            placeholder="Buscar por CPF, Nome ou Placa"
            className="w-full text-sm text-ink placeholder:text-subtle focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          {FILTERS.map((filter) => {
            const isActive = statusFilter === filter.key
            const count = filter.key === 'ACTIVE' ? counts.active : filter.key === 'FINISHED' ? counts.finished : counts.total
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
          onClick={() => setIsNewEntryOpen(true)}
          disabled={!lookups}
          className="flex items-center gap-1.5 rounded-[10px] bg-brand px-4 py-2.5 text-sm font-bold text-white hover:opacity-90 disabled:opacity-50"
        >
          <Plus className="size-4" strokeWidth={2.5} />
          Registrar Nova Entrada
        </button>
      </div>

      {(error || lookupsError) && (
        <p className="text-sm text-red-600">
          Não foi possível carregar os dados de controle de acessos. Tente novamente mais tarde.
        </p>
      )}

      <div className="flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="flex justify-between bg-canvas px-5 py-3 text-xs font-bold uppercase text-muted">
          <p className="w-[220px]">Nome do Visitante / CPF</p>
          <p className="w-[110px] text-center">Placa</p>
          <p className="w-[160px] text-center">Anfitrião (Visitado)</p>
          <p className="w-[110px] text-center">Entrada</p>
          <p className="w-[110px] text-center">Saída</p>
          <p className="w-[100px] text-center">Status</p>
          <p className="w-[120px] text-center">Ações</p>
        </div>

        {isLoading || !lookups ? null : enrichedLogs.length === 0 ? (
          <p className="px-5 py-8 text-sm text-muted">Nenhum acesso encontrado.</p>
        ) : (
          enrichedLogs.map((log) => {
            const badge = STATUS_BADGES[log.status] ?? { label: log.status, className: 'bg-gray-100 text-gray-700' }
            return (
              <div key={log.id} className="flex items-center justify-between border-t border-gray-200 px-5 py-3.5">
                <div className="flex w-[220px] flex-col gap-0.5">
                  <p className="truncate text-sm font-semibold text-ink">{log.personName}</p>
                  <p className="text-[11px] text-gray-500">{log.personCpf ? formatCpf(log.personCpf) : '—'}</p>
                </div>
                <p className="w-[110px] text-center text-sm font-bold text-ink">
                  {log.vehiclePlate ? formatPlateInput(log.vehiclePlate) : '—'}
                </p>
                <p className="w-[160px] truncate text-center text-sm text-gray-700">{log.visitedPersonName ?? '—'}</p>
                <p className="w-[110px] text-center text-sm text-gray-700">{formatDateTime(log.entryTime)}</p>
                <p className="w-[110px] text-center text-sm text-subtle">{log.exitTime ? formatDateTime(log.exitTime) : '----'}</p>
                <div className="flex w-[100px] items-center justify-center">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${badge.className}`}>{badge.label}</span>
                </div>
                <div className="flex w-[120px] items-center justify-center gap-2">
                  <Link
                    to={`/access-control/${log.id}`}
                    title="Ver detalhes"
                    className="flex size-8 items-center justify-center rounded-lg border border-gray-200 bg-white hover:bg-gray-50"
                  >
                    <Eye className="size-4 text-gray-600" strokeWidth={1.75} />
                  </Link>
                  <button
                    type="button"
                    title="Imprimir recibo"
                    onClick={() => printReceipt(log)}
                    className="flex size-8 items-center justify-center rounded-lg border border-gray-200 bg-white hover:bg-gray-50"
                  >
                    <Printer className="size-4 text-gray-600" strokeWidth={1.75} />
                  </button>
                  {log.status === 'ACTIVE' && (
                    <button
                      type="button"
                      title="Registrar saída"
                      onClick={() => setExitingLog(log)}
                      className="flex size-8 items-center justify-center rounded-lg border border-gray-200 bg-white hover:bg-gray-50"
                    >
                      <LogOut className="size-4 text-gray-600" strokeWidth={1.75} />
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

      {isNewEntryOpen && lookups && (
        <NewEntryDrawer
          lookups={lookups}
          defaultGateId={selectedGateId !== 'all' ? selectedGateId : undefined}
          onClose={() => setIsNewEntryOpen(false)}
          onCreated={() => {
            setIsNewEntryOpen(false)
            changeFilter('ACTIVE')
            refetch()
          }}
        />
      )}

      {exitingLog && (
        <ExitDrawer
          logId={exitingLog.id}
          status={exitingLog.status}
          personName={exitingLog.personName}
          personCpf={exitingLog.personCpf}
          vehiclePlate={exitingLog.vehiclePlate}
          vehicleLabel={exitingLog.vehicleLabel}
          sectorName={exitingLog.sectorName}
          visitedPersonName={exitingLog.visitedPersonName}
          entryTime={exitingLog.entryTime}
          defaultGateId={selectedGateId !== 'all' ? selectedGateId : lookups?.gatesList[0]?.id}
          onClose={() => setExitingLog(null)}
          onExited={() => {
            setExitingLog(null)
            refetch()
          }}
        />
      )}
    </div>
  )
}
