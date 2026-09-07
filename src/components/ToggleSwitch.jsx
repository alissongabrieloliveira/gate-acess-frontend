export default function ToggleSwitch({ checked, onChange, label }) {
  return (
    <label className="flex cursor-pointer items-center gap-2">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${
          checked ? 'bg-brand' : 'bg-line'
        }`}
      >
        {/* left-0 explícito é necessário: botões nativos têm text-align:
            center por padrão do navegador, e sem um `left` fixo o "auto"
            da bolinha absoluta é resolvido a partir desse text-align (não
            de 0), fazendo o translate-x ultrapassar o track quando ativado. */}
        <span
          className={`absolute left-0 top-0.5 size-4 rounded-full bg-white shadow transition-transform ${
            checked ? 'translate-x-[18px]' : 'translate-x-0.5'
          }`}
        />
      </button>
      {label && <span className="text-[13px] font-medium text-muted">{label}</span>}
    </label>
  )
}
