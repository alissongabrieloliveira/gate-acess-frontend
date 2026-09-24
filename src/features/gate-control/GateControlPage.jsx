import { DoorClosed, DoorOpen } from 'lucide-react'
import { useState } from 'react'
import { api } from '../../lib/api'
import { useAuth } from '../../lib/auth'
import { getErrorMessage } from '../../lib/errors'
import { RULES } from '../../lib/rules'
import GatewayDeviceCard from './GatewayDeviceCard'
import GatewayOutputsTable from './GatewayOutputsTable'
import { useGateDirectionsData } from './useGateDirectionsData'
import { useGatewayConfigData } from './useGatewayConfigData'

const STATE_LABEL = { ON: 'Aberto', OFF: 'Fechado', MIXED: 'Divergente' }

/**
 * Tela de DIAGNÓSTICO/TESTE ("a cancela está respondendo?"), restrita a
 * admin — não é mais o ponto de operação do dia a dia (isso agora é feito
 * pelos botões de Entrada/Saída em Controle de Acessos/Frota, ver
 * GateDirectionButtons.jsx, abertos a qualquer operador). Por isso aqui
 * mantém os 2 botões Abrir/Fechar separados (útil pra teste técnico), em
 * vez do toggle único usado no fluxo operacional.
 *
 * As cancelas são de impulso (cada pulso alterna abre/fecha) e o status é
 * só o PRESUMIDO pela última ação. Aqui os botões mandam `force`: pulsam
 * mesmo se o status já for o pedido — é o jeito de ressincronizar quando o
 * status divergir da cancela real: o pulso executa a ação clicada na cancela
 * real e o status passa a ser o dela (no fluxo operacional isso vira no-op).
 */
export default function GateControlPage() {
  const { user } = useAuth()
  const isAdmin = !!(user?.rules & RULES.ADMIN)

  const { isLoading, error, rows, refetch } = useGateDirectionsData()
  const { device, outputs, refetch: refetchConfig } = useGatewayConfigData()
  const [actionError, setActionError] = useState(null)
  const [pending, setPending] = useState(null) // { direction, action }

  // Mudar a config (provisionar/revogar gateway, add/editar/excluir saída)
  // pode mudar a lista de direções da seção de diagnóstico acima (ex.: uma
  // direção sem nenhuma saída não aparece nela) — refaz as duas buscas.
  function handleConfigChanged() {
    refetchConfig()
    refetch()
  }

  async function handleAction(row, action) {
    setActionError(null)
    setPending({ direction: row.direction, action })
    try {
      await api.post(`/gate-directions/${row.direction.toLowerCase()}/${action}`, { force: true })
      refetch()
    } catch (err) {
      setActionError(getErrorMessage(err, 'Não foi possível acionar a cancela.'))
    } finally {
      setPending(null)
    }
  }

  if (!isAdmin) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold text-ink">Controle de Portões</h1>
        </div>
        <p className="text-sm text-muted">Esta tela é restrita a administradores.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-ink">Controle de Portões</h1>
        <p className="text-sm text-muted">
          Diagnóstico e teste das cancelas de entrada/saída — confirme se o gateway e o controlador estão respondendo.
          Aqui cada clique sempre manda o pulso, que inverte a cancela. Se o status não bater com a cancela real, clique
          na ação que você quer que ela faça (ex.: está aberta mas aparece Fechado → Fechar) e o status volta a bater.
        </p>
      </div>

      {(error || actionError) && (
        <p className="text-sm text-red-600">
          {actionError ?? getErrorMessage(error, 'Não foi possível carregar as cancelas. Tente novamente mais tarde.')}
        </p>
      )}

      <div className="flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <div className="min-w-[680px]">
            <div className="flex justify-between bg-canvas px-5 py-3 text-xs font-bold uppercase text-muted">
              <p className="w-[160px]">Cancela</p>
              <p className="w-[180px]">Saídas</p>
              <p className="w-[140px]">Status</p>
              <p className="w-[220px] text-center">Ações</p>
            </div>

            {isLoading ? null : error ? null : rows.length === 0 ? (
              <p className="px-5 py-8 text-sm text-muted">Nenhuma cancela configurada ainda (ver seed de provisionamento do gateway).</p>
            ) : (
              rows.map((row) => {
                const isRowPending = pending?.direction === row.direction

                return (
                  <div key={row.direction} className="flex items-center justify-between border-t border-gray-200 px-5 py-3.5">
                    <p className="w-[160px] truncate text-sm font-semibold text-ink">{row.label}</p>
                    <p className="w-[180px] text-[13px] text-gray-700">
                      {row.outputs.length > 1 ? 'Saídas' : 'Saída'} {row.outputs.map((o) => o.outputNumber).join(', ')}
                    </p>
                    <div className="w-[140px]">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                          row.currentState === 'ON'
                            ? 'bg-green-100 text-green-700'
                            : row.currentState === 'OFF'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-yellow-100 text-yellow-700'
                        }`}
                      >
                        {STATE_LABEL[row.currentState]}
                      </span>
                    </div>
                    <div className="flex w-[220px] items-center justify-center gap-2">
                      <button
                        type="button"
                        disabled={isRowPending}
                        onClick={() => handleAction(row, 'open')}
                        className="flex items-center gap-1.5 rounded-[10px] bg-brand px-3.5 py-2 text-[13px] font-semibold text-white hover:opacity-90 disabled:opacity-40"
                      >
                        <DoorOpen className="size-4" strokeWidth={2} />
                        {isRowPending && pending.action === 'open' ? 'Abrindo...' : 'Abrir'}
                      </button>
                      <button
                        type="button"
                        disabled={isRowPending}
                        onClick={() => handleAction(row, 'close')}
                        className="flex items-center gap-1.5 rounded-[10px] border border-gray-200 bg-white px-3.5 py-2 text-[13px] font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-40"
                      >
                        <DoorClosed className="size-4" strokeWidth={2} />
                        {isRowPending && pending.action === 'close' ? 'Fechando...' : 'Fechar'}
                      </button>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4 border-t border-gray-200 pt-6">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-bold text-ink">Configuração</h2>
          <p className="text-sm text-muted">
            Provisione o gateway e configure o endereço de rede da(s) controladora(s) física(s) — substitui rodar o
            seed de provisionamento manualmente.
          </p>
        </div>

        <GatewayDeviceCard device={device} onChanged={handleConfigChanged} />
        <GatewayOutputsTable outputs={outputs} hasDevice={!!device} onChanged={handleConfigChanged} />
      </div>
    </div>
  )
}
