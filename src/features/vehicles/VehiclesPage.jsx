import { Lock, Pencil, Plus, Search, Unlock } from 'lucide-react'
import { useEffect, useState } from 'react'
import BlockReasonModal from '../../components/BlockReasonModal'
import { api } from '../../lib/api'
import { getErrorMessage } from '../../lib/errors'
import { formatPlateInput } from '../../lib/format'
import { PAGE_SIZE, useVehiclesData } from './useVehiclesData'
import VehicleFormDrawer from './VehicleFormDrawer'

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

export default function VehiclesPage() {
  const [page, setPage] = useState(1)
  const [searchText, setSearchText] = useState('')
  // Busca com debounce contra o backend (GET /vehicles?search=), que filtra
  // TODOS os veículos da empresa, não só a página já carregada no cliente —
  // mesmo ajuste já feito em Pessoas (buscar um veículo da página 2 enquanto
  // a tela mostrava a página 1 nunca encontrava nada).
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingVehicle, setEditingVehicle] = useState(null)
  const [blockingVehicle, setBlockingVehicle] = useState(null)
  const [actionError, setActionError] = useState(null)

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchText), 400)
    return () => clearTimeout(timer)
  }, [searchText])

  useEffect(() => {
    setPage(1)
  }, [debouncedSearch])

  const { isLoading, error, vehicles, pagination, refetch } = useVehiclesData({ page, search: debouncedSearch })

  async function handleUnblock(vehicle) {
    setActionError(null)
    try {
      await api.patch(`/vehicles/${vehicle.id}/block`, { isBlocked: false })
      refetch()
    } catch (err) {
      setActionError(getErrorMessage(err, 'Não foi possível desbloquear o veículo.'))
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-ink">Veículos</h1>
        <p className="text-sm text-muted">Cadastro de veículos de visitantes e da frota própria.</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex w-full items-center gap-2 rounded-[10px] border border-gray-200 bg-white px-3.5 py-2.5 shadow-sm sm:w-[300px]">
          <Search className="size-4 shrink-0 text-subtle" strokeWidth={2} />
          <input
            type="text"
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            placeholder="Buscar por placa, identificação, marca ou modelo"
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
          Novo Veículo
        </button>
      </div>

      {(error || actionError) && (
        <p className="text-sm text-red-600">
          {actionError ?? 'Não foi possível carregar os veículos. Tente novamente mais tarde.'}
        </p>
      )}

      <div className="flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        {/* min-w preserva as larguras fixas das colunas (1020px = soma delas)
            em vez de espremê-las — abaixo disso a tabela rola na horizontal
            (overflow-x-auto) ao invés de quebrar o layout num tablet. */}
        <div className="overflow-x-auto">
          <div className="min-w-[1020px]">
            <div className="flex justify-between bg-canvas px-5 py-3 text-xs font-bold uppercase text-muted">
              <p className="w-[130px]">Placa</p>
              <p className="w-[110px]">Identificação</p>
              <p className="w-[110px]">Marca</p>
              <p className="w-[110px]">Modelo</p>
              <p className="w-[90px]">Cor</p>
              <p className="w-[140px]">Cadastrado em</p>
              <p className="w-[140px]">Atualizado em</p>
              <p className="w-[100px]">Status</p>
              <p className="w-[90px] text-center">Ações</p>
            </div>

            {isLoading ? null : vehicles.length === 0 ? (
              <p className="px-5 py-8 text-sm text-muted">Nenhum veículo encontrado.</p>
            ) : (
              vehicles.map((vehicle) => (
                <div key={vehicle.id} className="flex items-center justify-between border-t border-gray-200 px-5 py-3.5">
                  <p className="w-[130px] text-sm font-bold text-ink">{formatPlateInput(vehicle.licensePlate)}</p>
                  <p className="w-[110px] text-sm text-gray-700">{vehicle.identificationCode ?? '—'}</p>
                  <p className="w-[110px] truncate text-sm text-gray-700">{vehicle.brand ?? '—'}</p>
                  <p className="w-[110px] truncate text-sm text-gray-700">{vehicle.model ?? '—'}</p>
                  <p className="w-[90px] truncate text-sm text-gray-700">{vehicle.color ?? '—'}</p>
                  <p className="w-[140px] text-[13px] text-gray-700">{formatDate(vehicle.createdAt)}</p>
                  <p className="w-[140px] text-[13px] text-gray-700">{formatDate(vehicle.updatedAt)}</p>
                  <div className="w-[100px]">
                    {vehicle.isBlocked ? (
                      <span
                        title={vehicle.blockReason ?? undefined}
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
                      onClick={() => setEditingVehicle(vehicle)}
                      className="flex size-8 items-center justify-center rounded-lg border border-gray-200 bg-white hover:bg-gray-50"
                    >
                      <Pencil className="size-4 text-gray-600" strokeWidth={1.75} />
                    </button>
                    {vehicle.isBlocked ? (
                      <button
                        type="button"
                        title="Desbloquear"
                        onClick={() => handleUnblock(vehicle)}
                        className="flex size-8 items-center justify-center rounded-lg border border-gray-200 bg-white hover:bg-gray-50"
                      >
                        <Unlock className="size-4 text-gray-600" strokeWidth={1.75} />
                      </button>
                    ) : (
                      <button
                        type="button"
                        title="Bloquear"
                        onClick={() => setBlockingVehicle(vehicle)}
                        className="flex size-8 items-center justify-center rounded-lg border border-gray-200 bg-white hover:bg-gray-50"
                      >
                        <Lock className="size-4 text-gray-600" strokeWidth={1.75} />
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-gray-200 bg-canvas px-5 py-3.5">
          <p className="text-[13px] text-muted">
            {pagination ? `Mostrando ${vehicles.length} de ${pagination.total} registros` : ''}
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
        <VehicleFormDrawer
          onClose={() => setIsCreateOpen(false)}
          onSaved={() => {
            setIsCreateOpen(false)
            refetch()
          }}
        />
      )}

      {editingVehicle && (
        <VehicleFormDrawer
          vehicle={editingVehicle}
          onClose={() => setEditingVehicle(null)}
          onSaved={() => {
            setEditingVehicle(null)
            refetch()
          }}
        />
      )}

      {blockingVehicle && (
        <BlockReasonModal
          title="Bloquear Veículo"
          description={
            <>
              A placa <span className="font-semibold text-ink">{formatPlateInput(blockingVehicle.licensePlate)}</span> será
              bloqueada e impedida de novos acessos.
            </>
          }
          errorMessage="Não foi possível bloquear o veículo."
          onClose={() => setBlockingVehicle(null)}
          onConfirm={async (reason) => {
            await api.patch(`/vehicles/${blockingVehicle.id}/block`, { isBlocked: true, reason })
            setBlockingVehicle(null)
            refetch()
          }}
        />
      )}
    </div>
  )
}
