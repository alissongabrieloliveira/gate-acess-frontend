import { Bell } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useAlerts } from '../lib/alertsContext'
import AlertItem from './AlertItem'

const GROUP_ORDER = ['gateway', 'people', 'fleet', 'retroactive']

function groupLabels(thresholds) {
  return {
    gateway: 'Cancelas',
    people: `Pessoas dentro há mais de ${thresholds?.personInsideHours ?? 12}h`,
    fleet: `Frota na rua há mais de ${thresholds?.fleetOnTripHours ?? 24}h`,
    retroactive: 'Lançamentos retroativos (últimas 24h)',
  }
}

// Único lugar onde os alertas aparecem: lista completa, agrupada por tipo,
// com rolagem dentro do painel (a página não cresce).
export default function AlertsBell() {
  const { items, count, thresholds, error } = useAlerts()
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef(null)

  useEffect(() => {
    if (!isOpen) return undefined
    function onPointerDown(event) {
      if (!containerRef.current?.contains(event.target)) setIsOpen(false)
    }
    function onKeyDown(event) {
      if (event.key === 'Escape') setIsOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [isOpen])

  const close = () => setIsOpen(false)
  // Gateway offline (queda) impede o trabalho na hora (cancelas não abrem):
  // número em vermelho pulsando; os demais alertas — inclusive o gateway
  // encerrado pelo operador — ficam em âmbar.
  const isCritical = items.some((item) => item.group === 'gateway' && item.tone === 'danger')
  const labels = groupLabels(thresholds)
  const groups = GROUP_ORDER.map((id) => ({ id, items: items.filter((item) => item.group === id) })).filter(
    (group) => group.items.length,
  )

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        title="Alertas"
        aria-label={count ? `Alertas (${count})` : 'Alertas'}
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
        className="relative flex size-[38px] items-center justify-center rounded-[10px] border border-gray-200 bg-white text-muted shadow-sm hover:bg-gray-50"
      >
        <Bell className="size-[18px]" strokeWidth={1.75} />
        {count > 0 && (
          <span className="absolute -right-1.5 -top-1.5 flex h-[18px] min-w-[18px]">
            {isCritical && <span className="absolute inset-0 animate-ping rounded-full bg-red-500 opacity-75" />}
            <span
              className={`relative flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] font-bold text-white ${
                isCritical ? 'bg-red-600' : 'bg-amber-500'
              }`}
            >
              {count > 99 ? '99+' : count}
            </span>
          </span>
        )}
      </button>

      {isOpen && (
        // No celular os controles quebram linha e o sino pode ficar no meio da
        // tela: o painel ocupa a largura toda em vez de ancorar no botão.
        <div className="fixed inset-x-4 top-16 z-40 flex max-h-[75vh] flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg sm:absolute sm:inset-x-auto sm:right-0 sm:top-auto sm:mt-2 sm:w-[380px]">
          <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
            <p className="text-sm font-bold text-ink">Alertas</p>
            {count > 0 && <span className="text-xs font-semibold text-muted">{count}</span>}
          </div>
          {count === 0 ? (
            <p className="px-4 py-6 text-sm text-muted">
              {error ? 'Não foi possível carregar os alertas.' : 'Nenhum alerta no momento.'}
            </p>
          ) : (
            <div className="flex flex-col overflow-y-auto">
              {groups.map((group) => (
                <div key={group.id} className="flex flex-col">
                  <p className="sticky top-0 bg-canvas px-4 py-2 text-[11px] font-bold uppercase text-muted">
                    {labels[group.id]} ({group.items.length})
                  </p>
                  <div className="flex flex-col divide-y divide-gray-100">
                    {group.items.map((item) => (
                      <AlertItem key={item.key} item={item} onNavigate={close} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
