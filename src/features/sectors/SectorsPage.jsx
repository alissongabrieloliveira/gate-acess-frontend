import { Lock, Pencil, Plus, Search, Unlock } from 'lucide-react'
import { useEffect, useState } from 'react'
import { api } from '../../lib/api'
import { useAuth } from '../../lib/auth'
import { getErrorMessage } from '../../lib/errors'
import { RULES } from '../../lib/rules'
import SectorFormDrawer from './SectorFormDrawer'
import { PAGE_SIZE, useSectorsData } from './useSectorsData'

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
 * Mesmo critério de Postos de Controle: leitura aberta a qualquer operador
 * autenticado (precisa escolher o setor de destino ao registrar uma
 * entrada — sectors.routes.js só exige RULES.ADMIN pra criar/editar). Por
 * isso a tela sempre mostra a listagem, mas esconde "Novo Setor" e as
 * ações de editar/ativar-desativar pra quem não é admin.
 */
export default function SectorsPage() {
  const { user } = useAuth()
  const isAdmin = !!(user?.rules & RULES.ADMIN)

  const [page, setPage] = useState(1)
  const [searchText, setSearchText] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingSector, setEditingSector] = useState(null)
  const [actionError, setActionError] = useState(null)

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchText), 400)
    return () => clearTimeout(timer)
  }, [searchText])

  useEffect(() => {
    setPage(1)
  }, [debouncedSearch])

  const { isLoading, error, sectors, pagination, refetch } = useSectorsData({ page, search: debouncedSearch })

  async function handleToggleActive(sector) {
    setActionError(null)
    try {
      await api.put(`/sectors/${sector.id}`, { isActive: !sector.isActive })
      refetch()
    } catch (err) {
      setActionError(getErrorMessage(err, 'Não foi possível atualizar o status do setor.'))
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-ink">Setores</h1>
        <p className="text-sm text-muted">Cadastro dos setores de destino da empresa.</p>
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
            Novo Setor
          </button>
        )}
      </div>

      {(error || actionError) && (
        <p className="text-sm text-red-600">
          {actionError ?? getErrorMessage(error, 'Não foi possível carregar os setores. Tente novamente mais tarde.')}
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

            {isLoading ? null : error ? null : sectors.length === 0 ? (
              <p className="px-5 py-8 text-sm text-muted">Nenhum setor encontrado.</p>
            ) : (
              sectors.map((sector) => (
                <div key={sector.id} className="flex items-center justify-between border-t border-gray-200 px-5 py-3.5">
                  <p className="w-[220px] truncate text-sm font-semibold text-ink">{sector.name}</p>
                  <p className="w-[320px] truncate text-sm text-gray-700">{sector.description ?? '—'}</p>
                  <p className="w-[140px] text-[13px] text-gray-700">{formatDate(sector.createdAt)}</p>
                  <div className="w-[90px]">
                    {sector.isActive ? (
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
                        onClick={() => setEditingSector(sector)}
                        className="flex size-8 items-center justify-center rounded-lg border border-gray-200 bg-white hover:bg-gray-50"
                      >
                        <Pencil className="size-4 text-gray-600" strokeWidth={1.75} />
                      </button>
                      <button
                        type="button"
                        title={sector.isActive ? 'Desativar' : 'Ativar'}
                        onClick={() => handleToggleActive(sector)}
                        className="flex size-8 items-center justify-center rounded-lg border border-gray-200 bg-white hover:bg-gray-50"
                      >
                        {sector.isActive ? (
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
            {pagination ? `Mostrando ${sectors.length} de ${pagination.total} registros` : ''}
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
        <SectorFormDrawer
          onClose={() => setIsCreateOpen(false)}
          onSaved={() => {
            setIsCreateOpen(false)
            refetch()
          }}
        />
      )}

      {editingSector && (
        <SectorFormDrawer
          sector={editingSector}
          onClose={() => setEditingSector(null)}
          onSaved={() => {
            setEditingSector(null)
            refetch()
          }}
        />
      )}
    </div>
  )
}
