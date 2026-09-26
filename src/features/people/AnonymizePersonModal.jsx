import { useState } from 'react'
import Modal from '../../components/Modal'
import { api } from '../../lib/api'
import { getErrorMessage } from '../../lib/errors'

// Anonimização a pedido do titular (LGPD art. 18) — irreversível, por isso a
// confirmação explícita. Regras e o que é removido: backend
// modules/anonymization/anonymization.service.js.
export default function AnonymizePersonModal({ person, onClose, onAnonymized }) {
  const [confirmed, setConfirmed] = useState(false)
  const [error, setError] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleConfirm() {
    setError(null)
    setIsSubmitting(true)
    try {
      await api.post(`/people/${person.id}/anonymize`)
      onAnonymized()
    } catch (err) {
      setError(getErrorMessage(err, 'Não foi possível anonimizar a pessoa.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal title="Anonimizar Pessoa (LGPD)" onClose={onClose}>
      <div className="flex flex-col gap-3 text-sm text-muted">
        <p>
          Use quando <span className="font-semibold text-ink">{person.name}</span> pedir a exclusão dos próprios
          dados. O cadastro passa a se chamar &quot;Titular anonimizado&quot;.
        </p>
        <div>
          <p className="font-semibold text-ink">Serão apagados:</p>
          <ul className="ml-4 list-disc">
            <li>nome, CPF, RG, telefone e foto;</li>
            <li>motivo da visita, observações, fotos e recibos das visitas dela;</li>
            <li>a placa do veículo de visitante usado nas visitas;</li>
            <li>as cópias desses dados na Auditoria.</li>
          </ul>
        </div>
        <div>
          <p className="font-semibold text-ink">Continuam (sem identificar a pessoa):</p>
          <ul className="ml-4 list-disc">
            <li>datas, postos, setores e KM dos acessos;</li>
            <li>as saídas da frota, com veículo, KM, destino e motivo.</li>
          </ul>
        </div>
        <p>Se o titular também pediu uma cópia dos dados, use &quot;Exportar dados&quot; antes.</p>

        <label className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-red-800">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
            className="mt-0.5"
          />
          <span>Entendo que a anonimização é definitiva e não pode ser desfeita.</span>
        </label>
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

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
          disabled={!confirmed || isSubmitting}
          className="rounded-[10px] bg-red-600 px-4 py-2.5 text-sm font-bold text-white hover:opacity-90 disabled:opacity-50"
        >
          {isSubmitting ? 'Anonimizando...' : 'Anonimizar'}
        </button>
      </div>
    </Modal>
  )
}
