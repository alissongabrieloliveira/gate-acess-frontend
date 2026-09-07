import { Lock, Pencil, Plus, Search, Unlock } from 'lucide-react'
import { useMemo, useState } from 'react'
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
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingVehicle, setEditingVehicle] = useState(null)
  const [blockingVehicle, setBlockingVehicle] = useState(null)
  const [actionError, setActionError] = useState(null)

  const { isLoading, error, vehicles, pagination, refetch } = useVehiclesData({ page })

  // Busca só filtra a página atual já carregada — não existe busca full-text
  // no backend (mesma limitação já documentada no Controle de Acessos).
  const filteredVehicles = useMemo(() => {
    if (!searchText.trim()) return vehicles
    const term = searchText.trim().toLowerCase()
    // Placa é salva sem traço no banco — remove o traço também do termo
    // buscado, senão digitar "ABC-1116" (como a tela mostra) não bateria
    // com o "ABC1116" cru guardado em vehicle.licensePlate.
    const plateTerm = term.replace(/-/g, '')
    return vehicles.filter(
      (vehicle) =>
        vehicle.licensePlate?.toLowerCase().includes(plateTerm) ||
        vehicle.identificationCode?.toLowerCase().includes(term) ||
        vehicle.brand?.toLowerCase().includes(term) ||
        vehicle.model?.toLowerCase().includes(term),
    )
  }, [vehicles, searchText])

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

      <div className="flex items-center gap-3">
        <div className="flex w-[300px] items-center gap-2 rounded-[10px] border border-gray-200 bg-white px-3.5 py-2.5 shadow-sm">
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

        {isLoading ? (
          <p className="px-5 py-8 text-sm text-muted">Carregando...</p>
        ) : filteredVehicles.length === 0 ? (
          <p className="px-5 py-8 text-sm text-muted">Nenhum veículo encontrado.</p>
        ) : (
          filteredVehicles.map((vehicle) => (
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

        <div className="flex items-center justify-between border-t border-gray-200 bg-canvas px-5 py-3.5">
          <p className="text-[13px] text-muted">
            {pagination ? `Mostrando ${filteredVehicles.length} de ${pagination.total} registros` : ''}
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
