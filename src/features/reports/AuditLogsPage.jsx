import { ChevronDown, Eye } from 'lucide-react'
import { useEffect, useState } from 'react'
import Modal from '../../components/Modal'
import { api } from '../../lib/api'
import { getErrorMessage } from '../../lib/errors'
import { ACTION_LABELS, ACTIONS, AUDITED_TABLES, PAGE_SIZE, TABLE_LABELS, useAuditLogsData } from './useAuditLogsData'

const ACTION_BADGES = {
  INSERT: 'bg-green-100 text-green-700',
  UPDATE: 'bg-blue-100 text-blue-700',
  DELETE: 'bg-red-100 text-red-700',
}

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

// old_data/new_data são snapshots da linha inteira (row_to_json) — em campos
// *_encrypted o valor ali é o texto cifrado (base64), não o dado em claro
// (ver comentário em audit-logs.service.js). Mostrado como veio, sem tentar
// descriptografar aqui.
function DataBlock({ title, data }) {
  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-[11px] font-semibold uppercase text-subtle">{title}</p>
      {data ? (
        <pre className="max-h-64 overflow-auto rounded-lg bg-canvas p-3 text-xs text-gray-700">
          {JSON.stringify(data, null, 2)}
        </pre>
      ) : (
        <p className="rounded-lg bg-canvas p-3 text-xs text-subtle">—</p>
      )}
    </div>
  )
}

function AuditLogDetailModal({ logId, onClose }) {
  const [state, setState] = useState({ isLoading: true, error: null, detail: null })

  useEffect(() => {
    let cancelled = false
    setState({ isLoading: true, error: null, detail: null })
    api
      .get(`/audit-logs/${logId}`)
      .then(({ data }) => {
        if (!cancelled) setState({ isLoading: false, error: null, detail: data })
      })
      .catch((err) => {
        if (!cancelled) setState({ isLoading: false, error: err, detail: null })
      })
    return () => {
      cancelled = true
    }
  }, [logId])

  return (
    <Modal title="Detalhe da Alteração" onClose={onClose} width="max-w-2xl">
      {state.isLoading ? null : state.error ? (
        <p className="text-sm text-red-600">
          {getErrorMessage(state.error, 'Não foi possível carregar o detalhe deste registro.')}
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-[11px] font-semibold uppercase text-subtle">Tabela</p>
              <p className="text-ink">{TABLE_LABELS[state.detail.tableName] ?? state.detail.tableName}</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase text-subtle">Ação</p>
              <p className="text-ink">{ACTION_LABELS[state.detail.action] ?? state.detail.action}</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase text-subtle">Registro</p>
              <p className="text-ink">#{state.detail.recordId}</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase text-subtle">Data</p>
              <p className="text-ink">{formatDateTime(state.detail.changedAt)}</p>
            </div>
          </div>
          <DataBlock title="Antes" data={state.detail.oldData} />
          <DataBlock title="Depois" data={state.detail.newData} />
        </div>
      )}
    </Modal>
  )
}

export default function AuditLogsPage() {
  const [page, setPage] = useState(1)
  const [tableName, setTableName] = useState('')
  const [action, setAction] = useState('')
  const [userId, setUserId] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [detailLogId, setDetailLogId] = useState(null)

  useEffect(() => {
    setPage(1)
  }, [tableName, action, userId, from, to])

  const { isLoading, error, logs, usersList, pagination } = useAuditLogsData({
    page,
    tableName,
    action,
    userId,
    from: from || undefined,
    // Inclui o dia inteiro selecionado em "Até" — sem isso, o filtro
    // comparava contra 00:00 do dia e descartava tudo depois disso.
    to: to ? `${to}T23:59:59.999` : undefined,
  })

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-ink">Auditoria</h1>
        <p className="text-sm text-muted">Trilha de alterações (criação, atualização e exclusão) nos cadastros e operações.</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Select value={tableName} onChange={(e) => setTableName(e.target.value)}>
          <option value="">Todas as tabelas</option>
          {AUDITED_TABLES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </Select>

        <Select value={action} onChange={(e) => setAction(e.target.value)}>
          <option value="">Todas as ações</option>
          {ACTIONS.map((a) => (
            <option key={a.value} value={a.value}>
              {a.label}
            </option>
          ))}
        </Select>

        <Select value={userId} onChange={(e) => setUserId(e.target.value)}>
          <option value="">Todos os usuários</option>
          {usersList.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
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
          {getErrorMessage(error, 'Não foi possível carregar a trilha de auditoria. Tente novamente mais tarde.')}
        </p>
      )}

      <div className="flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        {/* min-w preserva as larguras fixas das colunas (790px = soma delas)
            em vez de espremê-las — abaixo disso a tabela rola na horizontal
            (overflow-x-auto) ao invés de quebrar o layout num tablet. */}
        <div className="overflow-x-auto">
          <div className="min-w-[790px]">
            <div className="flex justify-between bg-canvas px-5 py-3 text-xs font-bold uppercase text-muted">
              <p className="w-[180px]">Data</p>
              <p className="w-[180px]">Usuário</p>
              <p className="w-[160px]">Tabela</p>
              <p className="w-[100px] text-center">Ação</p>
              <p className="w-[90px] text-center">Registro</p>
              <p className="w-[80px] text-center">Detalhe</p>
            </div>

            {isLoading ? null : logs.length === 0 ? (
              <p className="px-5 py-8 text-sm text-muted">Nenhum registro de auditoria encontrado.</p>
            ) : (
              logs.map((log) => (
                <div key={log.id} className="flex items-center justify-between border-t border-gray-200 px-5 py-3.5">
                  <p className="w-[180px] text-sm text-gray-700">{formatDateTime(log.changedAt)}</p>
                  <p className="w-[180px] truncate text-sm text-gray-700">{log.userName}</p>
                  <p className="w-[160px] text-sm text-gray-700">{TABLE_LABELS[log.tableName] ?? log.tableName}</p>
                  <div className="flex w-[100px] items-center justify-center">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${ACTION_BADGES[log.action] ?? 'bg-gray-100 text-gray-700'}`}>
                      {ACTION_LABELS[log.action] ?? log.action}
                    </span>
                  </div>
                  <p className="w-[90px] text-center text-sm text-gray-700">#{log.recordId}</p>
                  <div className="flex w-[80px] items-center justify-center">
                    <button
                      type="button"
                      title="Ver detalhes"
                      onClick={() => setDetailLogId(log.id)}
                      className="flex size-8 items-center justify-center rounded-lg border border-gray-200 bg-white hover:bg-gray-50"
                    >
                      <Eye className="size-4 text-gray-600" strokeWidth={1.75} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

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

      {detailLogId && <AuditLogDetailModal logId={detailLogId} onClose={() => setDetailLogId(null)} />}
    </div>
  )
}
