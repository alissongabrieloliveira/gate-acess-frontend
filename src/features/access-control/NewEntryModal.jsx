import { useState } from 'react'
import Modal from '../../components/Modal'
import { api } from '../../lib/api'
import { getErrorMessage } from '../../lib/errors'

const inputClass =
  'w-full rounded-lg border border-line px-3 py-2 text-sm text-ink focus:border-brand focus:outline-none'
const labelClass = 'text-[13px] font-semibold text-ink'

export default function NewEntryModal({ lookups, defaultGateId, onClose, onCreated }) {
  const [form, setForm] = useState({
    personId: '',
    vehicleId: '',
    visitedPersonId: '',
    destinationSectorId: '',
    entryGateId: defaultGateId || String(lookups.gatesList[0]?.id ?? ''),
    visitReason: '',
    kmEntry: '',
    isKmUnavailable: false,
    receiptCode: '',
  })
  const [error, setError] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError(null)

    if (!form.personId || !form.entryGateId) {
      setError('Visitante e portão de entrada são obrigatórios.')
      return
    }

    setIsSubmitting(true)
    try {
      const { data } = await api.post('/access-logs', {
        personId: Number(form.personId),
        vehicleId: form.vehicleId ? Number(form.vehicleId) : undefined,
        visitedPersonId: form.visitedPersonId ? Number(form.visitedPersonId) : undefined,
        destinationSectorId: form.destinationSectorId ? Number(form.destinationSectorId) : undefined,
        entryGateId: Number(form.entryGateId),
        visitReason: form.visitReason || undefined,
        kmEntry: !form.isKmUnavailable && form.kmEntry ? Number(form.kmEntry) : undefined,
        isKmUnavailable: form.isKmUnavailable,
        receiptCode: form.receiptCode || undefined,
      })
      onCreated(data)
    } catch (err) {
      setError(getErrorMessage(err, 'Não foi possível registrar a entrada.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal title="Registrar Nova Entrada" onClose={onClose} width="max-w-xl">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2 flex flex-col gap-1.5">
            <label className={labelClass}>Visitante *</label>
            <select
              required
              value={form.personId}
              onChange={(event) => update('personId', event.target.value)}
              className={inputClass}
            >
              <option value="">Selecione...</option>
              {lookups.people.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.name}
                  {person.cpf ? ` — ${person.cpf}` : ''}
                  {person.isBlocked ? ' (bloqueado)' : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Veículo</label>
            <select
              value={form.vehicleId}
              onChange={(event) => update('vehicleId', event.target.value)}
              className={inputClass}
            >
              <option value="">Nenhum</option>
              {lookups.vehicles.map((vehicle) => (
                <option key={vehicle.id} value={vehicle.id}>
                  {vehicle.licensePlate}
                  {vehicle.isBlocked ? ' (bloqueado)' : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Portão de entrada *</label>
            <select
              required
              value={form.entryGateId}
              onChange={(event) => update('entryGateId', event.target.value)}
              className={inputClass}
            >
              {lookups.gatesList.map((gate) => (
                <option key={gate.id} value={gate.id}>
                  {gate.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Anfitrião (visitado)</label>
            <select
              value={form.visitedPersonId}
              onChange={(event) => update('visitedPersonId', event.target.value)}
              className={inputClass}
            >
              <option value="">Nenhum</option>
              {lookups.people.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Destino</label>
            <select
              value={form.destinationSectorId}
              onChange={(event) => update('destinationSectorId', event.target.value)}
              className={inputClass}
            >
              <option value="">Nenhum</option>
              {lookups.sectors.map((sector) => (
                <option key={sector.id} value={sector.id}>
                  {sector.name}
                </option>
              ))}
            </select>
          </div>

          <div className="col-span-2 flex flex-col gap-1.5">
            <label className={labelClass}>Motivo da visita</label>
            <input
              type="text"
              value={form.visitReason}
              onChange={(event) => update('visitReason', event.target.value)}
              className={inputClass}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>KM de entrada</label>
            <input
              type="number"
              min="0"
              disabled={form.isKmUnavailable}
              value={form.kmEntry}
              onChange={(event) => update('kmEntry', event.target.value)}
              className={`${inputClass} disabled:bg-gray-100 disabled:text-muted`}
            />
            <label className="mt-1 flex items-center gap-2 text-xs text-muted">
              <input
                type="checkbox"
                checked={form.isKmUnavailable}
                onChange={(event) => update('isKmUnavailable', event.target.checked)}
              />
              KM não disponível
            </label>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Código do recibo</label>
            <input
              type="text"
              value={form.receiptCode}
              onChange={(event) => update('receiptCode', event.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm font-semibold text-muted hover:bg-gray-100"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-lg bg-brand px-4 py-2 text-sm font-bold text-white hover:opacity-90 disabled:opacity-50"
          >
            {isSubmitting ? 'Registrando...' : 'Registrar Entrada'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
