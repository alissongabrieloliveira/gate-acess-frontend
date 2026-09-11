import { Lock, Pencil, Plus, Search, Trash2, Unlock } from 'lucide-react'
import { useEffect, useState } from 'react'
import Modal from '../../components/Modal'
import { api } from '../../lib/api'
import { useAuth } from '../../lib/auth'
import { getErrorMessage } from '../../lib/errors'
import { formatCpf } from '../../lib/format'
import { RULES } from '../../lib/rules'
import UserFormDrawer from './UserFormDrawer'
import { PAGE_SIZE, useUsersData } from './useUsersData'

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

function RemoveUserModal({ targetUser, onClose, onRemoved }) {
  const [error, setError] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleConfirm() {
    setError(null)
    setIsSubmitting(true)
    try {
      await api.delete(`/users/${targetUser.id}`)
      onRemoved()
    } catch (err) {
      setError(getErrorMessage(err, 'Não foi possível remover o usuário.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal title="Remover Usuário" onClose={onClose}>
      <p className="text-sm text-muted">
        <span className="font-semibold text-ink">{targetUser.name}</span> será removido(a) e perderá acesso ao
        sistema. Esta ação não pode ser desfeita pela tela.
      </p>

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      <div className="mt-4 flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={onClose}
          className="rounded-[10px] border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={isSubmitting}
          className="rounded-[10px] bg-red-600 px-4 py-2.5 text-sm font-bold text-white hover:opacity-90 disabled:opacity-50"
        >
          {isSubmitting ? 'Removendo...' : 'Confirmar Remoção'}
        </button>
      </div>
    </Modal>
  )
}

export default function UsersPage() {
  const { user: currentUser } = useAuth()
  const [page, setPage] = useState(1)
  const [searchText, setSearchText] = useState('')
  // Busca com debounce contra o backend (GET /users?search=), que filtra
  // TODOS os usuários da empresa, não só a página já carregada no cliente —
  // mesmo padrão já usado em Pessoas/Veículos/Controle de Acessos/Controle
  // de Frota.
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [removingUser, setRemovingUser] = useState(null)
  const [actionError, setActionError] = useState(null)

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchText), 400)
    return () => clearTimeout(timer)
  }, [searchText])

  useEffect(() => {
    setPage(1)
  }, [debouncedSearch])

  const { isLoading, error, users, pagination, refetch } = useUsersData({ page, search: debouncedSearch })

  async function handleToggleActive(targetUser) {
    setActionError(null)
    try {
      await api.patch(`/users/${targetUser.id}`, { isActive: !targetUser.isActive })
      refetch()
    } catch (err) {
      setActionError(getErrorMessage(err, 'Não foi possível atualizar o status do usuário.'))
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-ink">Usuários</h1>
        <p className="text-sm text-muted">Cadastro de operadores do sistema.</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex w-full items-center gap-2 rounded-[10px] border border-gray-200 bg-white px-3.5 py-2.5 shadow-sm sm:w-[300px]">
          <Search className="size-4 shrink-0 text-subtle" strokeWidth={2} />
          <input
            type="text"
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            placeholder="Buscar por nome, CPF ou e-mail"
            className="w-full text-sm text-ink placeholder:text-subtle focus:outline-none"
          />
        </div>

        <div className="flex-1" />

        <button
          type="button"
          onClick={() => setIsCreateOpen(true)}
          className="flex items-center gap-1.5 rounded-[10px] bg-brand px-4 py-2.5 text-sm font-bold text-white hover:opacity-90"
        >
          <Plus className="size-4" strokeWidth={2.5} />
          Novo Usuário
        </button>
      </div>

      {(error || actionError) && (
        <p className="text-sm text-red-600">
          {actionError ?? getErrorMessage(error, 'Não foi possível carregar os usuários. Tente novamente mais tarde.')}
        </p>
      )}

      <div className="flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        {/* min-w preserva as larguras fixas das colunas (1010px = soma delas)
            em vez de espremê-las — abaixo disso a tabela rola na horizontal
            (overflow-x-auto) ao invés de quebrar o layout num tablet. */}
        <div className="overflow-x-auto">
          <div className="min-w-[1010px]">
            <div className="flex justify-between bg-canvas px-5 py-3 text-xs font-bold uppercase text-muted">
              <p className="w-[200px]">Nome</p>
              <p className="w-[130px]">CPF</p>
              <p className="w-[220px]">E-mail</p>
              <p className="w-[110px]">Perfil</p>
              <p className="w-[140px]">Cadastrado em</p>
              <p className="w-[90px]">Status</p>
              <p className="w-[120px] text-center">Ações</p>
            </div>

            {isLoading ? null : error ? null : users.length === 0 ? (
              <p className="px-5 py-8 text-sm text-muted">Nenhum usuário encontrado.</p>
            ) : (
              users.map((row) => {
                const isSelf = String(row.id) === String(currentUser?.userId)
                const isAdmin = !!(row.rules & RULES.ADMIN)
                return (
                  <div key={row.id} className="flex items-center justify-between border-t border-gray-200 px-5 py-3.5">
                    <p className="w-[200px] truncate text-sm font-semibold text-ink">
                      {row.name}
                      {isSelf && <span className="ml-1.5 text-xs font-normal text-subtle">(você)</span>}
                    </p>
                    <p className="w-[130px] text-sm text-gray-700">{row.cpf ? formatCpf(row.cpf) : '—'}</p>
                    <p className="w-[220px] truncate text-sm text-gray-700">{row.email}</p>
                    <div className="w-[110px]">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                          isAdmin ? 'bg-brand-50 text-brand' : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {isAdmin ? 'Administrador' : 'Operador'}
                      </span>
                    </div>
                    <p className="w-[140px] text-[13px] text-gray-700">{formatDate(row.createdAt)}</p>
                    <div className="flex w-[90px] flex-col items-start gap-1">
                      {row.isActive ? (
                        <span className="rounded-full bg-green-100 px-2.5 py-1 text-xs font-bold text-green-700">Ativo</span>
                      ) : (
                        <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-bold text-red-700">Inativo</span>
                      )}
                      {row.mustChangePassword && (
                        <span
                          title="Ainda não trocou a senha temporária definida na criação"
                          className="text-[10px] font-semibold text-amber-600"
                        >
                          Senha pendente
                        </span>
                      )}
                    </div>
                    <div className="flex w-[120px] items-center justify-center gap-2">
                      <button
                        type="button"
                        title="Editar"
                        onClick={() => setEditingUser(row)}
                        className="flex size-8 items-center justify-center rounded-lg border border-gray-200 bg-white hover:bg-gray-50"
                      >
                        <Pencil className="size-4 text-gray-600" strokeWidth={1.75} />
                      </button>
                      <button
                        type="button"
                        title={isSelf ? 'Não é possível desativar seu próprio usuário' : row.isActive ? 'Desativar' : 'Ativar'}
                        disabled={isSelf}
                        onClick={() => handleToggleActive(row)}
                        className="flex size-8 items-center justify-center rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {row.isActive ? (
                          <Lock className="size-4 text-gray-600" strokeWidth={1.75} />
                        ) : (
                          <Unlock className="size-4 text-gray-600" strokeWidth={1.75} />
                        )}
                      </button>
                      <button
                        type="button"
                        title={isSelf ? 'Não é possível remover seu próprio usuário' : 'Remover'}
                        disabled={isSelf}
                        onClick={() => setRemovingUser(row)}
                        className="flex size-8 items-center justify-center rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <Trash2 className="size-4 text-gray-600" strokeWidth={1.75} />
                      </button>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-gray-200 bg-canvas px-5 py-3.5">
          <p className="text-[13px] text-muted">
            {pagination ? `Mostrando ${users.length} de ${pagination.total} registros` : ''}
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
        <UserFormDrawer
          onClose={() => setIsCreateOpen(false)}
          onSaved={() => {
            setIsCreateOpen(false)
            refetch()
          }}
        />
      )}

      {editingUser && (
        <UserFormDrawer
          user={editingUser}
          onClose={() => setEditingUser(null)}
          onSaved={() => {
            setEditingUser(null)
            refetch()
          }}
        />
      )}

      {removingUser && (
        <RemoveUserModal
          targetUser={removingUser}
          onClose={() => setRemovingUser(null)}
          onRemoved={() => {
            setRemovingUser(null)
            refetch()
          }}
        />
      )}
    </div>
  )
}
