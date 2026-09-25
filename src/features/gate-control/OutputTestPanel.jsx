import { Power, PowerOff, Zap } from 'lucide-react'
import { useState } from 'react'
import { api } from '../../lib/api'
import { getErrorMessage } from '../../lib/errors'

const DIRECTION_LABEL = { ENTRY: 'Entrada', EXIT: 'Saída' }
const PULSE_OPTIONS = [1, 2, 3, 5, 10]
const MODE_LABEL = { pulse: 'Pulso', on: 'Ligar', off: 'Desligar' }

function describeResult(mode, seconds) {
  const time = new Date().toLocaleTimeString('pt-BR')
  if (mode === 'pulse') return `Pulso de ${seconds}s enviado às ${time}`
  return `${mode === 'on' ? 'Ligada' : 'Desligada'} às ${time}`
}

/**
 * Aciona cada saída de relé SOZINHA (pulso com tempo escolhido, ou
 * liga/desliga sustentado) — pra testar em campo cada braço da cancela
 * dupla separadamente. Não altera o status presumido das cancelas acima.
 */
export default function OutputTestPanel({ outputs }) {
  const [secondsById, setSecondsById] = useState({})
  const [pending, setPending] = useState(null) // { id, mode }
  const [resultById, setResultById] = useState({}) // id -> { ok, message }

  async function handleTest(output, mode) {
    const seconds = secondsById[output.id] ?? 5
    setPending({ id: output.id, mode })
    setResultById((r) => ({ ...r, [output.id]: null }))
    try {
      await api.post(`/gateway-config/outputs/${output.id}/test`, mode === 'pulse' ? { mode, seconds } : { mode })
      setResultById((r) => ({ ...r, [output.id]: { ok: true, message: describeResult(mode, seconds) } }))
    } catch (err) {
      setResultById((r) => ({
        ...r,
        [output.id]: { ok: false, message: getErrorMessage(err, 'Não foi possível acionar a saída.') },
      }))
    } finally {
      setPending(null)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-bold text-ink">Teste por saída</h2>
        <p className="text-sm text-muted">
          Aciona um relé por vez, sem os outros da mesma cancela — útil pra testar cada braço da cancela dupla
          separadamente. Pulso liga o relé e desliga sozinho depois do tempo escolhido; Ligar/Desligar deixam o relé no
          estado pedido. Estes botões não mudam o status das cancelas acima. Faça o teste sem veículos na pista.
        </p>
      </div>

      <div className="flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <div className="min-w-[680px]">
            <div className="flex justify-between bg-canvas px-5 py-3 text-xs font-bold uppercase text-muted">
              <p className="w-[140px]">Saída</p>
              <p className="w-[110px]">Tempo do pulso</p>
              <p className="w-[330px] text-center">Ações</p>
            </div>

            {outputs.length === 0 ? (
              <p className="px-5 py-8 text-sm text-muted">Nenhuma saída configurada ainda.</p>
            ) : (
              outputs.map((output) => {
                const isRowPending = pending?.id === output.id
                const result = resultById[output.id]

                return (
                  <div key={output.id} className="flex flex-col gap-1.5 border-t border-gray-200 px-5 py-3.5">
                    <div className="flex items-center justify-between">
                      <p className="w-[140px] text-sm font-semibold text-ink">
                        Saída {output.outputNumber}
                        <span className="ml-1.5 text-xs font-normal text-muted">
                          ({DIRECTION_LABEL[output.direction] ?? output.direction})
                        </span>
                      </p>
                      <div className="w-[110px]">
                        <select
                          aria-label={`Tempo do pulso da saída ${output.outputNumber}`}
                          value={secondsById[output.id] ?? 5}
                          onChange={(e) => setSecondsById((s) => ({ ...s, [output.id]: Number(e.target.value) }))}
                          className="rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-sm text-gray-700"
                        >
                          {PULSE_OPTIONS.map((s) => (
                            <option key={s} value={s}>
                              {s}s
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="flex w-[330px] items-center justify-center gap-2">
                        <button
                          type="button"
                          disabled={!!pending}
                          onClick={() => handleTest(output, 'pulse')}
                          className="flex items-center gap-1.5 rounded-[10px] bg-brand px-3.5 py-2 text-[13px] font-semibold text-white hover:opacity-90 disabled:opacity-40"
                        >
                          <Zap className="size-4" strokeWidth={2} />
                          {isRowPending && pending.mode === 'pulse' ? 'Pulsando...' : MODE_LABEL.pulse}
                        </button>
                        <button
                          type="button"
                          disabled={!!pending}
                          onClick={() => handleTest(output, 'on')}
                          className="flex items-center gap-1.5 rounded-[10px] border border-gray-200 bg-white px-3.5 py-2 text-[13px] font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-40"
                        >
                          <Power className="size-4" strokeWidth={2} />
                          {isRowPending && pending.mode === 'on' ? 'Ligando...' : MODE_LABEL.on}
                        </button>
                        <button
                          type="button"
                          disabled={!!pending}
                          onClick={() => handleTest(output, 'off')}
                          className="flex items-center gap-1.5 rounded-[10px] border border-gray-200 bg-white px-3.5 py-2 text-[13px] font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-40"
                        >
                          <PowerOff className="size-4" strokeWidth={2} />
                          {isRowPending && pending.mode === 'off' ? 'Desligando...' : MODE_LABEL.off}
                        </button>
                      </div>
                    </div>
                    {result && (
                      <p className={`text-xs ${result.ok ? 'text-green-700' : 'text-red-600'}`}>{result.message}</p>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
