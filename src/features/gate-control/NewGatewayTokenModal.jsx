import { Check, Copy } from 'lucide-react'
import { useState } from 'react'
import Modal from '../../components/Modal'

/**
 * Mostra o token bruto do gateway_devices recém-criado UMA ÚNICA VEZ — o
 * backend só guarda o hash (mesmo padrão de refresh_tokens), não há como
 * reobter esse valor depois de fechar este modal. Só fecha depois de
 * clicar "Copiei o token, pode fechar" (não tem botão de fechar no X do
 * Modal escondido/desabilitado seria mais complexo — em vez disso, o botão
 * de ação já é o único jeito de fechar, reforçando o aviso).
 */
export default function NewGatewayTokenModal({ token, onAcknowledge }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(token)
      setCopied(true)
    } catch {
      // navegador sem clipboard API — usuário copia manualmente do campo abaixo
    }
  }

  return (
    <Modal title="Gateway provisionado" onClose={onAcknowledge}>
      <p className="text-sm text-muted">
        Copie este token agora e cole no <code className="rounded bg-gray-100 px-1 py-0.5 text-xs">.env</code> do
        processo <code className="rounded bg-gray-100 px-1 py-0.5 text-xs">gateway</code> (variável{' '}
        <code className="rounded bg-gray-100 px-1 py-0.5 text-xs">DEVICE_TOKEN</code>). Ele{' '}
        <span className="font-bold text-ink">não será exibido de novo</span> — só o hash fica salvo no banco.
      </p>

      <div className="mt-4 flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 p-3">
        <code className="flex-1 break-all text-sm text-ink">{token}</code>
        <button
          type="button"
          onClick={handleCopy}
          className="flex shrink-0 items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
        >
          {copied ? <Check className="size-3.5 text-green-600" strokeWidth={2.5} /> : <Copy className="size-3.5" strokeWidth={2} />}
          {copied ? 'Copiado' : 'Copiar'}
        </button>
      </div>

      <button
        type="button"
        onClick={onAcknowledge}
        className="mt-4 w-full rounded-[10px] bg-brand px-4 py-2.5 text-sm font-bold text-white hover:opacity-90"
      >
        Copiei o token, pode fechar
      </button>
    </Modal>
  )
}
