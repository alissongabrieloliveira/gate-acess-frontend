import { FileClock, Route, Unplug, UserRoundSearch } from 'lucide-react'
import { Link } from 'react-router-dom'

const GROUP_ICONS = {
  gateway: Unplug,
  people: UserRoundSearch,
  fleet: Route,
  retroactive: FileClock,
}

const TONE_CLASSES = {
  danger: 'bg-red-100 text-red-700',
  warning: 'bg-amber-100 text-amber-700',
  info: 'bg-blue-100 text-blue-700',
}

// Uma linha de alerta do sininho. Com `to`, vira link
// para o registro; sem (gateway para operador), só informa.
export default function AlertItem({ item, onNavigate }) {
  const Icon = GROUP_ICONS[item.group] ?? FileClock
  const content = (
    <>
      <div className={`mt-0.5 shrink-0 rounded-lg p-1.5 ${TONE_CLASSES[item.tone] ?? TONE_CLASSES.info}`}>
        <Icon className="size-4" strokeWidth={2} />
      </div>
      <div className="flex min-w-0 flex-col gap-0.5">
        <p className="text-sm font-semibold text-ink">{item.title}</p>
        <p className="text-xs text-muted">{item.description}</p>
      </div>
    </>
  )

  const className = 'flex items-start gap-3 px-4 py-3'
  if (!item.to) return <div className={className}>{content}</div>
  return (
    <Link to={item.to} onClick={onNavigate} className={`${className} hover:bg-gray-50`}>
      {content}
    </Link>
  )
}
