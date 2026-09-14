import { useState } from 'react'
import SlideOver from '../../components/SlideOver'
import { api } from '../../lib/api'
import { getErrorMessage } from '../../lib/errors'

const inputClass =
  'w-full rounded-lg border border-gray-200 px-2.5 py-2 text-[13px] text-ink focus:border-brand focus:outline-none disabled:bg-gray-100 disabled:text-muted'
const labelClass = 'text-xs font-semibold text-gray-600'

/**
 * Cria ou edita uma saída de relé (host/porta/número/Ns) de uma direção
 * (Entrada/Saída) do gateway já provisionado. Só aparece com um
 * gateway_devices ativo — GatewayOutputsTable desabilita o botão "Adicionar
 * Saída" sem device (ver gateway-config.service.js#createOutput).
 */
export default function GatewayOutputFormDrawer({ output, onClose, onSaved }) {
  const [direction, setDirection] = useState(output?.direction ?? 'ENTRY')
  const [outputNumber, setOutputNumber] = useState(output?.outputNumber ?? 1)
  const [host, setHost] = useState(output?.host ?? '')
  const [port, setPort] = useState(output?.port ?? 5000)
  const [ns, setNs] = useState(output?.ns ?? '')
  const [error, setError] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const isEditing = !!output
  const canSubmit = host.trim().length > 0 && ns.trim().length === 5

  async function handleSubmit(event) {
    event.preventDefault()
    setError(null)
    if (!canSubmit) {
      setError('Preencha host e Ns (5 caracteres) corretamente.')
      return
    }

    setIsSubmitting(true)
    try {
      const payload = {
        direction,
        outputNumber: Number(outputNumber),
        host: host.trim(),
        port: Number(port),
        ns: ns.trim(),
      }

      if (isEditing) {
        await api.put(`/gateway-config/outputs/${output.id}`, payload)
      } else {
        await api.post('/gateway-config/outputs', payload)
      }

      onSaved()
    } catch (err) {
      setError(getErrorMessage(err, 'Não foi possível salvar a saída.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <SlideOver
      title={isEditing ? 'Editar Saída' : 'Adicionar Saída'}
      subtitle="Endereço de rede da controladora física (ver gateway/README.md)."
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
            form="gateway-output-form"
            disabled={isSubmitting || !canSubmit}
            className="flex-1 rounded-lg bg-brand px-4 py-2.5 text-[13px] font-semibold text-brand-50 hover:opacity-90 disabled:opacity-50"
          >
            {isSubmitting ? 'Salvando...' : 'Salvar Saída'}
          </button>
        </>
      }
    >
      <form id="gateway-output-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <label className={labelClass}>Direção *</label>
            <select value={direction} onChange={(event) => setDirection(event.target.value)} className={inputClass}>
              <option value="ENTRY">Entrada</option>
              <option value="EXIT">Saída</option>
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className={labelClass}>Número da Saída (1-4) *</label>
            <input
              type="number"
              required
              min={1}
              max={4}
              value={outputNumber}
              onChange={(event) => setOutputNumber(event.target.value)}
              className={inputClass}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className={labelClass}>Host (IP) *</label>
            <input
              type="text"
              required
              value={host}
              onChange={(event) => setHost(event.target.value)}
              placeholder="Ex.: 192.168.1.50"
              className={inputClass}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className={labelClass}>Porta *</label>
            <input
              type="number"
              required
              min={1}
              max={65535}
              value={port}
              onChange={(event) => setPort(event.target.value)}
              className={inputClass}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className={labelClass}>Ns (serial, 5 caracteres) *</label>
            <input
              type="text"
              required
              maxLength={5}
              value={ns}
              onChange={(event) => setNs(event.target.value)}
              placeholder="Ex.: 00000"
              className={inputClass}
            />
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
      </form>
    </SlideOver>
  )
}
