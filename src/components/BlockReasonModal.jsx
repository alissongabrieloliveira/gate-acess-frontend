import { useState } from 'react'
import Modal from './Modal'
import { getErrorMessage } from '../lib/errors'

/**
 * Modal genérico de "bloquear com motivo" — mesma forma usada por
 * people.block e vehicles.block no backend (motivo obrigatório). Extraído
 * de VehiclesPage (onde nasceu) porque a tela de Pessoas precisa exatamente
 * do mesmo fluxo — segunda vez que é necessário, deixa de fazer sentido
 * duplicar (mesmo critério já usado antes neste projeto).
 */
export default function BlockReasonModal({ title, description, onClose, onConfirm, errorMessage }) {
  const [reason, setReason] = useState('')
  const [error, setError] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleConfirm() {
    setError(null)
    if (!reason.trim()) {
      setError('Informe o motivo do bloqueio.')
      return
    }
    setIsSubmitting(true)
    try {
      await onConfirm(reason.trim())
    } catch (err) {
      setError(getErrorMessage(err, errorMessage ?? 'Não foi possível bloquear.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal title={title} onClose={onClose}>
      <p className="text-sm text-muted">{description}</p>
      <div className="mt-4 flex flex-col gap-1.5">
        <label className="text-[11px] font-semibold uppercase text-subtle">Motivo do Bloqueio</label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          placeholder="Descreva o motivo do bloqueio..."
          className="w-full resize-none rounded-[10px] border border-gray-200 px-3.5 py-2.5 text-sm text-ink placeholder:text-subtle focus:border-brand focus:outline-none"
        />
      </div>

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
          {isSubmitting ? 'Bloqueando...' : 'Confirmar Bloqueio'}
        </button>
      </div>
    </Modal>
  )
}
