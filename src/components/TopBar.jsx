import { Bell, ChevronDown, Search, User } from 'lucide-react'

export function TopBarControls({ gates, selectedGateId, onGateChange }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative">
        <select
          value={selectedGateId}
          onChange={(event) => onGateChange(event.target.value)}
          className="appearance-none rounded-[10px] border border-gray-200 bg-white py-2 pl-3 pr-8 text-sm font-semibold text-brand focus:outline-none"
        >
          <option value="all">Todos os postos</option>
          {gates.map((gate) => (
            <option key={gate.id} value={String(gate.id)}>
              {gate.name}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted" />
      </div>

      {/* Sem backend de busca full-text — presente visualmente, sem comportamento (mesmo padrão do "Esqueci a senha" da tela de login).
          Escondida abaixo de `lg`: como não faz nada de verdade, não vale gastar a largura já apertada do tablet com ela. */}
      <div className="hidden w-[260px] items-center gap-2 rounded-[10px] border border-gray-200 bg-white px-3.5 py-2.5 shadow-sm lg:flex">
        <Search className="size-4 shrink-0 text-subtle" strokeWidth={2} />
        <input
          type="text"
          placeholder="Buscar pessoas ou veículos"
          className="w-full text-sm text-ink placeholder:text-subtle focus:outline-none"
        />
      </div>

      {/* Sem backend de notificações — sem indicador de "não lido" fabricado. */}
      <button
        type="button"
        title="Notificações"
        className="flex size-[38px] items-center justify-center rounded-[10px] border border-gray-200 bg-white text-muted shadow-sm hover:bg-gray-50"
      >
        <Bell className="size-[18px]" strokeWidth={1.75} />
      </button>

      <div className="flex size-[38px] items-center justify-center rounded-full bg-gray-100 text-muted">
        <User className="size-[18px]" strokeWidth={1.75} />
      </div>
    </div>
  )
}

export default function TopBar({ title, gates, selectedGateId, onGateChange }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 py-2">
      <h1 className="text-2xl font-bold text-ink lg:text-[28px]">{title}</h1>
      <TopBarControls gates={gates} selectedGateId={selectedGateId} onGateChange={onGateChange} />
    </div>
  )
}
