import { AlertTriangle } from 'lucide-react'
import { useState } from 'react'
import SlideOver from '../../components/SlideOver'
import { api } from '../../lib/api'
import { getErrorMessage } from '../../lib/errors'
import { formatPlateInput } from '../../lib/format'

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

export default function ReturnDrawer({
  logId,
  vehiclePlate,
  vehicleLabel,
  driverName,
  destination,
  purpose,
  towPlate,
  departureTime,
  defaultGateId,
  onClose,
  onReturned,
}) {
  const [kmReturn, setKmReturn] = useState('')
  const [fuelLevelReturn, setFuelLevelReturn] = useState('')
  const [observation, setObservation] = useState('')
  const [error, setError] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleConfirm() {
    setError(null)
    if (!defaultGateId) {
      setError('Nenhum portão disponível para registrar o retorno.')
      return
    }
    setIsSubmitting(true)
    try {
      await api.patch(`/fleet-logs/${logId}/return`, {
        returnGateId: Number(defaultGateId),
        kmReturn: kmReturn ? Number(kmReturn) : undefined,
        fuelLevelReturn: fuelLevelReturn ? Number(fuelLevelReturn) : undefined,
        observation: observation.trim() || undefined,
      })
      onReturned()
    } catch (err) {
      setError(getErrorMessage(err, 'Não foi possível registrar o retorno.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <SlideOver
      title="Registrar Retorno"
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
            {isSubmitting ? 'Confirmando...' : 'Confirmar Retorno'}
          </button>
        </>
      }
    >
      <div className="flex items-center gap-2.5">
        <p className="text-lg font-bold text-ink">{vehiclePlate ? formatPlateInput(vehiclePlate) : '—'}</p>
        <span className="rounded-full bg-green-100 px-2.5 py-1 text-xs font-bold text-green-700">Na Rua</span>
      </div>
      <p className="-mt-2 text-[13px] text-subtle">{vehicleLabel ?? 'Sem marca/modelo cadastrado'}</p>

      <hr className="my-4 border-gray-200" />

      <div className="flex flex-col gap-3">
        <p className="text-[13px] font-semibold text-ink">Resumo da Viagem</p>
        <div className="flex gap-4">
          <Field label="Motorista" value={driverName ?? 'Sem motorista (carga)'} />
          <Field label="Guincho" value={towPlate ? formatPlateInput(towPlate) : null} />
        </div>
        <div className="flex gap-4">
          <Field label="Destino" value={destination} />
          <Field label="Motivo" value={purpose} />
        </div>
        <div className="flex gap-4">
          <Field label="Data de Saída" value={formatDate(departureTime)} />
          <Field label="Hora de Saída" value={formatTime(departureTime)} />
        </div>
      </div>

      <hr className="my-4 border-gray-200" />

      <div className="flex flex-col gap-3">
        <p className="text-[13px] font-semibold text-ink">Dados do Retorno</p>
        <div className="flex gap-4">
          <div className="flex flex-1 flex-col gap-1.5">
            <label className="text-[11px] font-semibold uppercase text-subtle">KM de Retorno</label>
            <input
              type="number"
              min="0"
              value={kmReturn}
              onChange={(event) => setKmReturn(event.target.value)}
              placeholder="Informe o KM"
              className="h-11 w-full rounded-[10px] border border-gray-200 px-3.5 text-sm text-ink placeholder:text-subtle focus:border-brand focus:outline-none"
            />
          </div>
          <div className="flex flex-1 flex-col gap-1.5">
            <label className="text-[11px] font-semibold uppercase text-subtle">Combustível (%)</label>
            <input
              type="number"
              min="0"
              max="100"
              value={fuelLevelReturn}
              onChange={(event) => setFuelLevelReturn(event.target.value)}
              placeholder="Ex.: 75"
              className="h-11 w-full rounded-[10px] border border-gray-200 px-3.5 text-sm text-ink placeholder:text-subtle focus:border-brand focus:outline-none"
            />
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-semibold uppercase text-subtle">Observações</label>
          <textarea
            value={observation}
            onChange={(event) => setObservation(event.target.value)}
            placeholder="Observações sobre o retorno..."
            rows={3}
            className="w-full resize-none rounded-[10px] border border-gray-200 px-3.5 py-2.5 text-sm text-ink placeholder:text-subtle focus:border-brand focus:outline-none"
          />
        </div>
      </div>

      <div className="mt-4 flex items-center gap-3 rounded-[10px] border border-amber-200 bg-amber-100 p-3">
        <AlertTriangle className="size-5 shrink-0 text-amber-800" strokeWidth={1.75} />
        <p className="text-[13px] font-semibold text-amber-800">
          Ao confirmar, o status será alterado para Retornado.
        </p>
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </SlideOver>
  )
}
