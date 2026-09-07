import { Lock, Pencil, Plus, Search, Unlock } from 'lucide-react'
import { useMemo, useState } from 'react'
import BlockReasonModal from '../../components/BlockReasonModal'
import { api } from '../../lib/api'
import { getErrorMessage } from '../../lib/errors'
import { formatCpf, formatPhone } from '../../lib/format'
import PersonFormDrawer from './PersonFormDrawer'
import { PAGE_SIZE, PERSON_TYPE_LABELS, usePeopleData } from './usePeopleData'

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

export default function PeoplePage() {
  const [page, setPage] = useState(1)
  const [searchText, setSearchText] = useState('')
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingPerson, setEditingPerson] = useState(null)
  const [blockingPerson, setBlockingPerson] = useState(null)
  const [actionError, setActionError] = useState(null)

  const { isLoading, error, people, pagination, refetch } = usePeopleData({ page })

  // Busca só filtra a página atual já carregada — não existe busca full-text
  // no backend (mesma limitação já documentada em Veículos/Controle de
  // Acessos; o backend só tem lookup exato de CPF via ?cpf=).
  const filteredPeople = useMemo(() => {
    if (!searchText.trim()) return people
    const term = searchText.trim().toLowerCase()
    // CPF e telefone são salvos sem pontuação — remove pontuação do termo
    // buscado, senão digitar "123.456.789-10" ou "(11) 99999-8888" (como a
    // tela agora mostra, formatados) não bateria com o valor cru guardado em
    // person.cpf/person.phone.
    const digitsTerm = term.replace(/\D/g, '')
    return people.filter(
      (person) =>
        person.name?.toLowerCase().includes(term) ||
        (digitsTerm && (person.cpf?.includes(digitsTerm) || person.phone?.includes(digitsTerm))),
    )
  }, [people, searchText])

  async function handleUnblock(person) {
    setActionError(null)
    try {
      await api.patch(`/people/${person.id}/block`, { isBlocked: false })
      refetch()
    } catch (err) {
      setActionError(getErrorMessage(err, 'Não foi possível desbloquear a pessoa.'))
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-ink">Pessoas</h1>
        <p className="text-sm text-muted">Cadastro de visitantes, prestadores e funcionários.</p>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex w-[300px] items-center gap-2 rounded-[10px] border border-gray-200 bg-white px-3.5 py-2.5 shadow-sm">
          <Search className="size-4 shrink-0 text-subtle" strokeWidth={2} />
          <input
            type="text"
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            placeholder="Buscar por nome, CPF ou telefone"
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
          Nova Pessoa
        </button>
      </div>

      {(error || actionError) && (
        <p className="text-sm text-red-600">
          {actionError ?? 'Não foi possível carregar as pessoas. Tente novamente mais tarde.'}
        </p>
      )}

      <div className="flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="flex justify-between bg-canvas px-5 py-3 text-xs font-bold uppercase text-muted">
          <p className="w-[220px]">Nome</p>
          <p className="w-[130px]">CPF</p>
          <p className="w-[110px]">Tipo</p>
          <p className="w-[140px]">Telefone</p>
          <p className="w-[140px]">Cadastrado em</p>
          <p className="w-[100px]">Status</p>
          <p className="w-[90px] text-center">Ações</p>
        </div>

        {isLoading ? (
          <p className="px-5 py-8 text-sm text-muted">Carregando...</p>
        ) : filteredPeople.length === 0 ? (
          <p className="px-5 py-8 text-sm text-muted">Nenhuma pessoa encontrada.</p>
        ) : (
          filteredPeople.map((person) => (
            <div key={person.id} className="flex items-center justify-between border-t border-gray-200 px-5 py-3.5">
              <p className="w-[220px] truncate text-sm font-semibold text-ink">{person.name}</p>
              <p className="w-[130px] text-sm text-gray-700">{person.cpf ? formatCpf(person.cpf) : '—'}</p>
              <p className="w-[110px] text-sm text-gray-700">{PERSON_TYPE_LABELS[person.personType] ?? '—'}</p>
              <p className="w-[140px] truncate text-sm text-gray-700">{person.phone ? formatPhone(person.phone) : '—'}</p>
              <p className="w-[140px] text-[13px] text-gray-700">{formatDate(person.createdAt)}</p>
              <div className="w-[100px]">
                {person.isBlocked ? (
                  <span
                    title={person.blockReason ?? undefined}
                    className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-bold text-red-700"
                  >
                    Bloqueado
                  </span>
                ) : (
                  <span className="rounded-full bg-green-100 px-2.5 py-1 text-xs font-bold text-green-700">Ativo</span>
                )}
              </div>
              <div className="flex w-[90px] items-center justify-center gap-2">
                <button
                  type="button"
                  title="Editar"
                  onClick={() => setEditingPerson(person)}
                  className="flex size-8 items-center justify-center rounded-lg border border-gray-200 bg-white hover:bg-gray-50"
                >
                  <Pencil className="size-4 text-gray-600" strokeWidth={1.75} />
                </button>
                {person.isBlocked ? (
                  <button
                    type="button"
                    title="Desbloquear"
                    onClick={() => handleUnblock(person)}
                    className="flex size-8 items-center justify-center rounded-lg border border-gray-200 bg-white hover:bg-gray-50"
                  >
                    <Unlock className="size-4 text-gray-600" strokeWidth={1.75} />
                  </button>
                ) : (
                  <button
                    type="button"
                    title="Bloquear"
                    onClick={() => setBlockingPerson(person)}
                    className="flex size-8 items-center justify-center rounded-lg border border-gray-200 bg-white hover:bg-gray-50"
                  >
                    <Lock className="size-4 text-gray-600" strokeWidth={1.75} />
                  </button>
                )}
              </div>
            </div>
          ))
        )}

        <div className="flex items-center justify-between border-t border-gray-200 bg-canvas px-5 py-3.5">
          <p className="text-[13px] text-muted">
            {pagination ? `Mostrando ${filteredPeople.length} de ${pagination.total} registros` : ''}
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
        <PersonFormDrawer
          onClose={() => setIsCreateOpen(false)}
          onSaved={() => {
            setIsCreateOpen(false)
            refetch()
          }}
        />
      )}

      {editingPerson && (
        <PersonFormDrawer
          person={editingPerson}
          onClose={() => setEditingPerson(null)}
          onSaved={() => {
            setEditingPerson(null)
            refetch()
          }}
        />
      )}

      {blockingPerson && (
        <BlockReasonModal
          title="Bloquear Pessoa"
          description={
            <>
              <span className="font-semibold text-ink">{blockingPerson.name}</span> será bloqueado(a) e impedido(a) de
              novos acessos.
            </>
          }
          errorMessage="Não foi possível bloquear a pessoa."
          onClose={() => setBlockingPerson(null)}
          onConfirm={async (reason) => {
            await api.patch(`/people/${blockingPerson.id}/block`, { isBlocked: true, reason })
            setBlockingPerson(null)
            refetch()
          }}
        />
      )}
    </div>
  )
}
