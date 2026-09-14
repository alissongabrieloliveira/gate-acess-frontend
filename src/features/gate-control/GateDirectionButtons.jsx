import { DoorClosed, DoorOpen } from 'lucide-react'
import { useState } from 'react'
import { api } from '../../lib/api'
import { getErrorMessage } from '../../lib/errors'
import { useGateDirectionsData } from './useGateDirectionsData'

const CONFIG = {
  ENTRY: { label: 'Cancela de Entrada' },
  EXIT: { label: 'Cancela de Saída' },
}

/**
 * Botões operacionais de abrir/fechar as cancelas de entrada/saída — cada
 * um é um TOGGLE único (não abrir/fechar separados): mostra o estado atual
 * e o clique manda a ação oposta. Compartilhado entre Controle de Acessos
 * e Controle de Frota (mesma cancela física, mesmo estado). Aberto a
 * qualquer operador autenticado — sem checagem de permissão aqui (a tela
 * de diagnóstico /gate-control é que fica restrita a admin).
 */
export default function GateDirectionButtons() {
  const { rows, refetch } = useGateDirectionsData()
  const [pending, setPending] = useState(null) // direction
  const [error, setError] = useState(null)

  async function handleToggle(row) {
    setError(null)
    setPending(row.direction)
    const action = row.currentState === 'ON' ? 'close' : 'open'
    try {
      await api.post(`/gate-directions/${row.direction.toLowerCase()}/${action}`)
      refetch()
    } catch (err) {
      setError(getErrorMessage(err, 'Não foi possível acionar a cancela.'))
    } finally {
      setPending(null)
    }
  }

  if (rows.length === 0) return null

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-2">
        {rows.map((row) => {
          const isOpen = row.currentState === 'ON'
          const isRowPending = pending === row.direction
          const Icon = isOpen ? DoorOpen : DoorClosed

          return (
            <button
              key={row.direction}
              type="button"
              disabled={isRowPending}
              onClick={() => handleToggle(row)}
              className={`flex items-center gap-1.5 rounded-[10px] px-3.5 py-2 text-[13px] font-semibold disabled:opacity-50 ${
                isOpen ? 'bg-brand text-brand-50' : 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Icon className="size-4" strokeWidth={2} />
              {isRowPending ? (isOpen ? 'Fechando...' : 'Abrindo...') : (CONFIG[row.direction]?.label ?? row.label)}
            </button>
          )
        })}
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}
