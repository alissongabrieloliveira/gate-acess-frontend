import { Pencil, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import ConfirmModal from '../../components/ConfirmModal'
import { api } from '../../lib/api'
import GatewayOutputFormDrawer from './GatewayOutputFormDrawer'

const DIRECTION_LABEL = { ENTRY: 'Entrada', EXIT: 'Saída' }

/**
 * CRUD das saídas de relé (host/porta/número/Ns) do gateway ativo — só
 * habilitado com um gateway_devices provisionado (ver GatewayDeviceCard).
 */
export default function GatewayOutputsTable({ outputs, hasDevice, onChanged }) {
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingOutput, setEditingOutput] = useState(null)
  const [deletingOutput, setDeletingOutput] = useState(null)

  function openCreate() {
    setEditingOutput(null)
    setIsFormOpen(true)
  }

  function openEdit(output) {
    setEditingOutput(output)
    setIsFormOpen(true)
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-ink">Saídas configuradas</h3>
        <button
          type="button"
          disabled={!hasDevice}
          onClick={openCreate}
          title={hasDevice ? undefined : 'Provisione um gateway antes de configurar saídas'}
          className="flex items-center gap-1.5 rounded-[10px] bg-brand px-3.5 py-2 text-[13px] font-semibold text-white hover:opacity-90 disabled:opacity-40"
        >
          <Plus className="size-4" strokeWidth={2.5} />
          Adicionar Saída
        </button>
      </div>

      <div className="flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <div className="min-w-[620px]">
            <div className="flex justify-between bg-canvas px-5 py-3 text-xs font-bold uppercase text-muted">
              <p className="w-[100px]">Direção</p>
              <p className="w-[80px]">Saída</p>
              <p className="w-[220px]">Endereço</p>
              <p className="w-[80px]">Ns</p>
              <p className="w-[80px] text-center">Ações</p>
            </div>

            {outputs.length === 0 ? (
              <p className="px-5 py-8 text-sm text-muted">Nenhuma saída configurada ainda.</p>
            ) : (
              outputs.map((output) => (
                <div key={output.id} className="flex items-center justify-between border-t border-gray-200 px-5 py-3.5">
                  <p className="w-[100px] text-sm font-semibold text-ink">{DIRECTION_LABEL[output.direction] ?? output.direction}</p>
                  <p className="w-[80px] text-sm text-gray-700">{output.outputNumber}</p>
                  <p className="w-[220px] truncate text-sm text-gray-700">
                    {output.host}:{output.port}
                  </p>
                  <p className="w-[80px] text-sm text-gray-700">{output.ns}</p>
                  <div className="flex w-[80px] items-center justify-center gap-2">
                    <button
                      type="button"
                      title="Editar"
                      onClick={() => openEdit(output)}
                      className="flex size-8 items-center justify-center rounded-lg border border-gray-200 bg-white hover:bg-gray-50"
                    >
                      <Pencil className="size-4 text-gray-600" strokeWidth={1.75} />
                    </button>
                    <button
                      type="button"
                      title="Excluir"
                      onClick={() => setDeletingOutput(output)}
                      className="flex size-8 items-center justify-center rounded-lg border border-gray-200 bg-white hover:bg-gray-50"
                    >
                      <Trash2 className="size-4 text-red-600" strokeWidth={1.75} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {isFormOpen && (
        <GatewayOutputFormDrawer
          output={editingOutput}
          onClose={() => setIsFormOpen(false)}
          onSaved={() => {
            setIsFormOpen(false)
            onChanged()
          }}
        />
      )}

      {deletingOutput && (
        <ConfirmModal
          title="Excluir saída"
          description={`A saída ${deletingOutput.outputNumber} (${DIRECTION_LABEL[deletingOutput.direction]}) será removida da configuração. Isso não afeta fisicamente o relé, só o mapeamento no sistema.`}
          confirmLabel="Excluir"
          errorMessage="Não foi possível excluir a saída."
          onClose={() => setDeletingOutput(null)}
          onConfirm={async () => {
            await api.delete(`/gateway-config/outputs/${deletingOutput.id}`)
            setDeletingOutput(null)
            onChanged()
          }}
        />
      )}
    </div>
  )
}
