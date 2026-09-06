import { useState } from 'react'
import SlideOver from '../../components/SlideOver'
import { api } from '../../lib/api'
import { getErrorMessage } from '../../lib/errors'

const inputClass =
  'w-full rounded-lg border border-gray-200 px-2.5 py-2 text-[13px] text-ink focus:border-brand focus:outline-none disabled:bg-gray-100 disabled:text-muted'
const labelClass = 'text-xs font-semibold text-gray-600'

function StepBadge({ number }) {
  return (
    <span className="flex size-6 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-xs font-bold text-brand">
      {number}
    </span>
  )
}

/**
 * Cria ou edita um veículo (POST/PUT /vehicles). vehicleType não é exposto
 * aqui — o schema não define uma enumeração formal pra esse campo (mesma
 * decisão já tomada no NewEntryDrawer do Controle de Acessos, que também
 * cadastra veículo sem perguntar o tipo e deixa o backend usar o default).
 */
export default function VehicleFormDrawer({ vehicle, onClose, onSaved }) {
  const isEditing = !!vehicle
  const [licensePlate, setLicensePlate] = useState(vehicle?.licensePlate ?? '')
  const [brand, setBrand] = useState(vehicle?.brand ?? '')
  const [model, setModel] = useState(vehicle?.model ?? '')
  const [color, setColor] = useState(vehicle?.color ?? '')
  const [error, setError] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const canSubmit = licensePlate.trim().length > 0

  async function handleSubmit(event) {
    event.preventDefault()
    setError(null)
    if (!canSubmit) {
      setError('Placa é obrigatória.')
      return
    }
    setIsSubmitting(true)
    try {
      const payload = {
        licensePlate,
        brand: brand.trim() || undefined,
        model: model.trim() || undefined,
        color: color.trim() || undefined,
      }
      if (isEditing) {
        await api.put(`/vehicles/${vehicle.id}`, payload)
      } else {
        await api.post('/vehicles', payload)
      }
      onSaved()
    } catch (err) {
      setError(getErrorMessage(err, 'Não foi possível salvar o veículo.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <SlideOver
      title={isEditing ? 'Editar Veículo' : 'Novo Veículo'}
      subtitle={isEditing ? `Placa ${vehicle.licensePlate}` : 'Cadastre um veículo de visitante ou da frota.'}
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
            type="submit"
            form="vehicle-form"
            disabled={isSubmitting || !canSubmit}
            className="flex-1 rounded-lg bg-brand px-4 py-2.5 text-[13px] font-semibold text-brand-50 hover:opacity-90 disabled:opacity-50"
          >
            {isSubmitting ? 'Salvando...' : 'Salvar Veículo'}
          </button>
        </>
      }
    >
      <form id="vehicle-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-1.5">
            <StepBadge number={1} />
            <p className="text-[13px] font-bold text-ink">Dados do Veículo</p>
          </div>

          <div className="flex flex-col gap-1">
            <label className={labelClass}>Placa *</label>
            <input
              type="text"
              required
              value={licensePlate}
              onChange={(event) => setLicensePlate(event.target.value)}
              placeholder="ABC1D23"
              className={inputClass}
            />
          </div>

          <div className="flex gap-2">
            <div className="flex flex-1 flex-col gap-1">
              <label className={labelClass}>Marca</label>
              <input
                type="text"
                value={brand}
                onChange={(event) => setBrand(event.target.value)}
                placeholder="Fiat"
                className={inputClass}
              />
            </div>
            <div className="flex flex-1 flex-col gap-1">
              <label className={labelClass}>Modelo</label>
              <input
                type="text"
                value={model}
                onChange={(event) => setModel(event.target.value)}
                placeholder="Cross"
                className={inputClass}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className={labelClass}>Cor</label>
            <input
              type="text"
              value={color}
              onChange={(event) => setColor(event.target.value)}
              placeholder="Prata"
              className={inputClass}
            />
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
      </form>
    </SlideOver>
  )
}
