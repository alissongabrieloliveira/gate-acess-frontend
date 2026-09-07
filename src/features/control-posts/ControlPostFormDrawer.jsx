import { useState } from 'react'
import SlideOver from '../../components/SlideOver'
import ToggleSwitch from '../../components/ToggleSwitch'
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
 * Cria ou edita um posto de controle / portão (POST/PUT /gates). Só admin
 * acessa este drawer (ControlPostsPage já esconde o botão/ações pra
 * operador comum — o backend também barra 403 se chamado sem permissão).
 * "Ativo" só aparece editando — posto novo já nasce ativo por padrão no
 * banco (mesmo critério já usado em people/vehicles/users).
 */
export default function ControlPostFormDrawer({ gate, onClose, onSaved }) {
  const [name, setName] = useState(gate?.name ?? '')
  const [description, setDescription] = useState(gate?.description ?? '')
  const [isActive, setIsActive] = useState(gate?.isActive ?? true)
  const [error, setError] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const isEditing = !!gate
  const canSubmit = name.trim().length > 0

  async function handleSubmit(event) {
    event.preventDefault()
    setError(null)
    if (!canSubmit) {
      setError('Nome é obrigatório.')
      return
    }

    setIsSubmitting(true)
    try {
      const payload = {
        name: name.trim(),
        description: description.trim() || undefined,
      }

      if (isEditing) {
        await api.put(`/gates/${gate.id}`, { ...payload, isActive })
      } else {
        await api.post('/gates', payload)
      }

      onSaved()
    } catch (err) {
      setError(getErrorMessage(err, 'Não foi possível salvar o posto de controle.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <SlideOver
      title={isEditing ? 'Editar Posto de Controle' : 'Novo Posto de Controle'}
      subtitle={isEditing ? name : 'Cadastre um novo portão/posto de controle.'}
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
            form="control-post-form"
            disabled={isSubmitting || !canSubmit}
            className="flex-1 rounded-lg bg-brand px-4 py-2.5 text-[13px] font-semibold text-brand-50 hover:opacity-90 disabled:opacity-50"
          >
            {isSubmitting ? 'Salvando...' : 'Salvar Posto de Controle'}
          </button>
        </>
      }
    >
      <form id="control-post-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-1.5">
            <StepBadge number={1} />
            <p className="text-[13px] font-bold text-ink">Dados do Posto de Controle</p>
          </div>

          <div className="flex flex-col gap-1">
            <label className={labelClass}>Nome *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Ex.: Portaria 1"
              className={inputClass}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className={labelClass}>Descrição</label>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={3}
              placeholder="Ex.: Entrada principal, acesso de veículos e pedestres"
              className={`${inputClass} resize-none`}
            />
          </div>

          {isEditing && (
            <div className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 p-3">
              <div className="flex flex-col gap-0.5">
                <p className={labelClass}>Ativo</p>
                <p className="text-[11px] text-muted">Postos inativos somem dos seletores de portão nas telas de operação.</p>
              </div>
              <ToggleSwitch checked={isActive} onChange={setIsActive} />
            </div>
          )}
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
      </form>
    </SlideOver>
  )
}
