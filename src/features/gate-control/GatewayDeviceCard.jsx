import { useState } from 'react'
import ConfirmModal from '../../components/ConfirmModal'
import { api } from '../../lib/api'
import { getErrorMessage } from '../../lib/errors'
import NewGatewayTokenModal from './NewGatewayTokenModal'

function formatDate(value) {
  if (!value) return null
  return new Date(value).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * Card de status do gateway_devices ativo da empresa — provisiona (mostra
 * o token uma única vez, ver NewGatewayTokenModal) ou revoga. "1 gateway
 * por empresa" (índice único parcial no banco) — por isso é sempre 0 ou 1
 * device, nunca uma lista.
 */
export default function GatewayDeviceCard({ device, onChanged }) {
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState(null)
  const [newToken, setNewToken] = useState(null)
  const [isRevoking, setIsRevoking] = useState(false)

  async function handleCreate() {
    setError(null)
    setIsCreating(true)
    try {
      const { data } = await api.post('/gateway-config/device', { name: 'Gateway Principal' })
      setNewToken(data.token)
    } catch (err) {
      setError(getErrorMessage(err, 'Não foi possível provisionar o gateway.'))
    } finally {
      setIsCreating(false)
    }
  }

  function handleTokenAcknowledged() {
    setNewToken(null)
    onChanged()
  }

  if (!device) {
    return (
      <div className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div>
          <h3 className="text-sm font-bold text-ink">Gateway</h3>
          <p className="text-sm text-muted">Nenhum gateway provisionado ainda.</p>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="button"
          onClick={handleCreate}
          disabled={isCreating}
          className="self-start rounded-[10px] bg-brand px-4 py-2.5 text-sm font-bold text-white hover:opacity-90 disabled:opacity-50"
        >
          {isCreating ? 'Provisionando...' : 'Provisionar Gateway'}
        </button>
        {newToken && <NewGatewayTokenModal token={newToken} onAcknowledge={handleTokenAcknowledged} />}
      </div>
    )
  }

  const lastSeenLabel = formatDate(device.lastSeenAt)

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-ink">{device.name}</h3>
          <p className="text-sm text-muted">{lastSeenLabel ? `Última conexão: ${lastSeenLabel}` : 'Nunca conectou'}</p>
        </div>
        <button
          type="button"
          onClick={() => setIsRevoking(true)}
          className="shrink-0 rounded-[10px] border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50"
        >
          Revogar
        </button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {isRevoking && (
        <ConfirmModal
          title="Revogar gateway"
          description="O processo gateway atual vai parar de conseguir se conectar até você provisionar um token novo e atualizar o .env na máquina dele. As saídas configuradas continuam salvas e são reaproveitadas automaticamente no próximo gateway."
          confirmLabel="Revogar"
          errorMessage="Não foi possível revogar o gateway."
          onClose={() => setIsRevoking(false)}
          onConfirm={async () => {
            await api.post('/gateway-config/device/revoke')
            setIsRevoking(false)
            onChanged()
          }}
        />
      )}
    </div>
  )
}
