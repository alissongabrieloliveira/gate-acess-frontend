import { useState } from 'react'
import Modal from './Modal'
import { getErrorMessage } from '../lib/errors'

/**
 * Modal genérico de "confirmar ação destrutiva" (sem campo de motivo —
 * ver BlockReasonModal.jsx pra esse caso). Extraído porque a tela de
 * Controle de Portões precisa do mesmo fluxo em 2 lugares (revogar
 * gateway, excluir saída) — mesmo critério já usado antes neste projeto
 * pra não duplicar.
 */
export default function ConfirmModal({ title, description, confirmLabel = 'Confirmar', onClose, onConfirm, errorMessage }) {
  const [error, setError] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleConfirm() {
    setError(null)
    setIsSubmitting(true)
    try {
      await onConfirm()
    } catch (err) {
      setError(getErrorMessage(err, errorMessage ?? 'Não foi possível concluir a ação.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal title={title} onClose={onClose}>
      <p className="text-sm text-muted">{description}</p>

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
          {isSubmitting ? 'Processando...' : confirmLabel}
        </button>
      </div>
    </Modal>
  )
}
