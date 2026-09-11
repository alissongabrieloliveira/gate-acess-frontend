import { ChevronDown } from 'lucide-react'
import { useEffect, useState } from 'react'
import { getErrorMessage } from '../../lib/errors'
import { PAGE_SIZE, STATUS_OPTIONS, useLoginLogsData } from './useLoginLogsData'

const STATUS_LABELS = { SUCCESS: 'Sucesso', FAILED: 'Falha' }
const STATUS_BADGES = { SUCCESS: 'bg-green-100 text-green-700', FAILED: 'bg-red-100 text-red-700' }

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
  if (!value) return '—'
  return new Date(value).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function LoginLogsPage() {
  const [page, setPage] = useState(1)
  const [userId, setUserId] = useState('')
  const [status, setStatus] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  useEffect(() => {
    setPage(1)
  }, [userId, status, from, to])

  const { isLoading, error, logs, usersList, pagination } = useLoginLogsData({
    page,
    userId,
    status,
    from: from || undefined,
    // Mesmo ajuste do relatório de Auditoria: inclui o dia inteiro
    // selecionado em "Até".
    to: to ? `${to}T23:59:59.999` : undefined,
  })

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-ink">Login</h1>
        <p className="text-sm text-muted">Histórico de tentativas de login dos usuários do sistema.</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Select value={userId} onChange={(e) => setUserId(e.target.value)}>
          <option value="">Todos os usuários</option>
          {usersList.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </Select>

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

      {error && (
        <p className="text-sm text-red-600">
          {getErrorMessage(error, 'Não foi possível carregar o histórico de login. Tente novamente mais tarde.')}
        </p>
      )}

      <div className="flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="flex justify-between bg-canvas px-5 py-3 text-xs font-bold uppercase text-muted">
          <p className="w-[180px]">Data</p>
          <p className="w-[180px]">Usuário</p>
          <p className="w-[140px]">IP</p>
          <p className="w-[280px]">Navegador / Dispositivo</p>
          <p className="w-[100px] text-center">Status</p>
        </div>

        {isLoading ? null : logs.length === 0 ? (
          <p className="px-5 py-8 text-sm text-muted">Nenhum registro de login encontrado.</p>
        ) : (
          logs.map((log) => (
            <div key={log.id} className="flex items-center justify-between border-t border-gray-200 px-5 py-3.5">
              <p className="w-[180px] text-sm text-gray-700">{formatDateTime(log.loginTime)}</p>
              <p className="w-[180px] truncate text-sm text-gray-700">{log.userName}</p>
              <p className="w-[140px] text-sm text-gray-700">{log.ipAddress ?? '—'}</p>
              <p className="w-[280px] truncate text-sm text-gray-700" title={log.userAgent ?? ''}>
                {log.userAgent ?? '—'}
              </p>
              <div className="flex w-[100px] items-center justify-center">
                <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${STATUS_BADGES[log.status] ?? 'bg-gray-100 text-gray-700'}`}>
                  {STATUS_LABELS[log.status] ?? log.status}
                </span>
              </div>
            </div>
          ))
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
