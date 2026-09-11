import { Lock, Pencil, Plus, Search, Unlock } from 'lucide-react'
import { useEffect, useState } from 'react'
import { api } from '../../lib/api'
import { useAuth } from '../../lib/auth'
import { getErrorMessage } from '../../lib/errors'
import { RULES } from '../../lib/rules'
import ControlPostFormDrawer from './ControlPostFormDrawer'
import { PAGE_SIZE, useControlPostsData } from './useControlPostsData'

function formatDate(value) {
  if (!value) return '—'
  return new Date(value).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * Diferente de Pessoas/Veículos/Usuários, aqui a leitura é aberta a
 * qualquer operador autenticado (precisa escolher o portão em telas de
 * entrada/saída — gates.routes.js só exige RULES.ADMIN pra criar/editar).
 * Por isso a tela sempre mostra a listagem, mas esconde "Novo Posto de
 * Controle" e as ações de editar/ativar-desativar pra quem não é admin —
 * mesmo critério já usado pra decidir esconder o link na Sidebar.
 */
export default function ControlPostsPage() {
  const { user } = useAuth()
  const isAdmin = !!(user?.rules & RULES.ADMIN)

  const [page, setPage] = useState(1)
  const [searchText, setSearchText] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingGate, setEditingGate] = useState(null)
  const [actionError, setActionError] = useState(null)

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchText), 400)
    return () => clearTimeout(timer)
  }, [searchText])

  useEffect(() => {
    setPage(1)
  }, [debouncedSearch])

  const { isLoading, error, gates, pagination, refetch } = useControlPostsData({ page, search: debouncedSearch })

  async function handleToggleActive(gate) {
    setActionError(null)
    try {
      await api.put(`/gates/${gate.id}`, { isActive: !gate.isActive })
      refetch()
    } catch (err) {
      setActionError(getErrorMessage(err, 'Não foi possível atualizar o status do posto de controle.'))
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-ink">Postos de Controle</h1>
        <p className="text-sm text-muted">Cadastro de portões e postos de controle da empresa.</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex w-full items-center gap-2 rounded-[10px] border border-gray-200 bg-white px-3.5 py-2.5 shadow-sm sm:w-[300px]">
          <Search className="size-4 shrink-0 text-subtle" strokeWidth={2} />
          <input
            type="text"
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            placeholder="Buscar por nome ou descrição"
            className="w-full text-sm text-ink placeholder:text-subtle focus:outline-none"
          />
        </div>

        <div className="flex-1" />

        {isAdmin && (
          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center gap-1.5 rounded-[10px] bg-brand px-4 py-2.5 text-sm font-bold text-white hover:opacity-90"
          >
            <Plus className="size-4" strokeWidth={2.5} />
            Novo Posto de Controle
          </button>
        )}
      </div>

      {(error || actionError) && (
        <p className="text-sm text-red-600">
          {actionError ?? getErrorMessage(error, 'Não foi possível carregar os postos de controle. Tente novamente mais tarde.')}
        </p>
      )}

      <div className="flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        {/* min-w preserva as larguras fixas das colunas (soma delas, variando
            se a coluna Ações existe ou não) em vez de espremê-las — abaixo
            disso a tabela rola na horizontal (overflow-x-auto) ao invés de
            quebrar o layout num tablet. */}
        <div className="overflow-x-auto">
          <div className={isAdmin ? 'min-w-[860px]' : 'min-w-[770px]'}>
            <div className="flex justify-between bg-canvas px-5 py-3 text-xs font-bold uppercase text-muted">
              <p className="w-[220px]">Nome</p>
              <p className="w-[320px]">Descrição</p>
              <p className="w-[140px]">Cadastrado em</p>
              <p className="w-[90px]">Status</p>
              {isAdmin && <p className="w-[90px] text-center">Ações</p>}
            </div>

            {isLoading ? null : error ? null : gates.length === 0 ? (
              <p className="px-5 py-8 text-sm text-muted">Nenhum posto de controle encontrado.</p>
            ) : (
              gates.map((gate) => (
                <div key={gate.id} className="flex items-center justify-between border-t border-gray-200 px-5 py-3.5">
                  <p className="w-[220px] truncate text-sm font-semibold text-ink">{gate.name}</p>
                  <p className="w-[320px] truncate text-sm text-gray-700">{gate.description ?? '—'}</p>
                  <p className="w-[140px] text-[13px] text-gray-700">{formatDate(gate.createdAt)}</p>
                  <div className="w-[90px]">
                    {gate.isActive ? (
                      <span className="rounded-full bg-green-100 px-2.5 py-1 text-xs font-bold text-green-700">Ativo</span>
                    ) : (
                      <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-bold text-red-700">Inativo</span>
                    )}
                  </div>
                  {isAdmin && (
                    <div className="flex w-[90px] items-center justify-center gap-2">
                      <button
                        type="button"
                        title="Editar"
                        onClick={() => setEditingGate(gate)}
                        className="flex size-8 items-center justify-center rounded-lg border border-gray-200 bg-white hover:bg-gray-50"
                      >
                        <Pencil className="size-4 text-gray-600" strokeWidth={1.75} />
                      </button>
                      <button
                        type="button"
                        title={gate.isActive ? 'Desativar' : 'Ativar'}
                        onClick={() => handleToggleActive(gate)}
                        className="flex size-8 items-center justify-center rounded-lg border border-gray-200 bg-white hover:bg-gray-50"
                      >
                        {gate.isActive ? (
                          <Lock className="size-4 text-gray-600" strokeWidth={1.75} />
                        ) : (
                          <Unlock className="size-4 text-gray-600" strokeWidth={1.75} />
                        )}
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-gray-200 bg-canvas px-5 py-3.5">
          <p className="text-[13px] text-muted">
            {pagination ? `Mostrando ${gates.length} de ${pagination.total} registros` : ''}
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

      {isCreateOpen && (
        <ControlPostFormDrawer
          onClose={() => setIsCreateOpen(false)}
          onSaved={() => {
            setIsCreateOpen(false)
            refetch()
          }}
        />
      )}

      {editingGate && (
        <ControlPostFormDrawer
          gate={editingGate}
          onClose={() => setEditingGate(null)}
          onSaved={() => {
            setEditingGate(null)
            refetch()
          }}
        />
      )}
    </div>
  )
}
