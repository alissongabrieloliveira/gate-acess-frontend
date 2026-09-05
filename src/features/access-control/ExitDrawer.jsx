import { AlertTriangle } from 'lucide-react'
import { useState } from 'react'
import SlideOver from '../../components/SlideOver'
import { api } from '../../lib/api'
import { getErrorMessage } from '../../lib/errors'

const STATUS_BADGES = {
  ACTIVE: { label: 'Ativo', className: 'bg-green-100 text-green-700' },
  FINISHED: { label: 'Finalizado', className: 'bg-gray-100 text-gray-600' },
}

function formatDate(value) {
  return value ? new Date(value).toLocaleDateString('pt-BR') : '----'
}

function formatTime(value) {
  return value ? new Date(value).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '----'
}

function Field({ label, value }) {
  return (
    <div className="flex flex-1 flex-col gap-1.5">
      <p className="text-[11px] font-semibold uppercase text-subtle">{label}</p>
      <p className="text-sm text-ink">{value ?? '—'}</p>
    </div>
  )
}

export default function ExitDrawer({ logId, status, personName, personCpf, vehiclePlate, vehicleLabel, sectorName, visitedPersonName, entryTime, defaultGateId, onClose, onExited }) {
  const [kmExit, setKmExit] = useState('')
  const [observation, setObservation] = useState('')
  const [error, setError] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleConfirm() {
    setError(null)
    if (!defaultGateId) {
      setError('Nenhum portão disponível para registrar a saída.')
      return
    }
    setIsSubmitting(true)
    try {
      await api.patch(`/access-logs/${logId}/exit`, {
        exitGateId: Number(defaultGateId),
        kmExit: kmExit ? Number(kmExit) : undefined,
        observation: observation.trim() || undefined,
      })
      onExited()
    } catch (err) {
      setError(getErrorMessage(err, 'Não foi possível registrar a saída.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const badge = STATUS_BADGES[status] ?? { label: status, className: 'bg-gray-100 text-gray-700' }

  return (
    <SlideOver
      title="Registrar Saída"
      onClose={onClose}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-[13px] font-semibold text-gray-700 hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isSubmitting}
            className="flex-1 rounded-lg bg-brand px-4 py-2.5 text-[13px] font-bold text-white hover:opacity-90 disabled:opacity-50"
          >
            {isSubmitting ? 'Confirmando...' : 'Confirmar Saída'}
          </button>
        </>
      }
    >
      <div className="flex items-center gap-2.5">
        <p className="text-lg font-bold text-ink">{personName}</p>
        <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${badge.className}`}>{badge.label}</span>
      </div>
      <p className="-mt-2 text-[13px] text-subtle">CPF {personCpf ?? 'não informado'}</p>

      <hr className="my-4 border-gray-200" />

      <div className="flex flex-col gap-3">
        <p className="text-[13px] font-semibold text-ink">Resumo da Visita</p>
        <div className="flex gap-4">
          <Field label="Placa" value={vehiclePlate} />
          <Field label="Veículo" value={vehicleLabel} />
        </div>
        <div className="flex gap-4">
          <Field label="Setor de Destino" value={sectorName} />
          <Field label="Anfitrião" value={visitedPersonName} />
        </div>
        <div className="flex gap-4">
          <Field label="Data de Entrada" value={formatDate(entryTime)} />
          <Field label="Hora de Entrada" value={formatTime(entryTime)} />
        </div>
      </div>

      <hr className="my-4 border-gray-200" />

      <div className="flex flex-col gap-3">
        <p className="text-[13px] font-semibold text-ink">Dados da Saída</p>
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-semibold uppercase text-subtle">KM de Saída</label>
          <input
            type="number"
            min="0"
            value={kmExit}
            onChange={(event) => setKmExit(event.target.value)}
            placeholder="Informe o KM"
            className="h-11 w-full rounded-[10px] border border-gray-200 px-3.5 text-sm text-ink placeholder:text-subtle focus:border-brand focus:outline-none"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-semibold uppercase text-subtle">Observações</label>
          <textarea
            value={observation}
            onChange={(event) => setObservation(event.target.value)}
            placeholder="Observações sobre a saída..."
            rows={3}
            className="w-full resize-none rounded-[10px] border border-gray-200 px-3.5 py-2.5 text-sm text-ink placeholder:text-subtle focus:border-brand focus:outline-none"
          />
        </div>
      </div>

      <div className="mt-4 flex items-center gap-3 rounded-[10px] border border-amber-200 bg-amber-100 p-3">
        <AlertTriangle className="size-5 shrink-0 text-amber-800" strokeWidth={1.75} />
        <p className="text-[13px] font-semibold text-amber-800">
          Ao confirmar, o status será alterado para Finalizado.
        </p>
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </SlideOver>
  )
}
