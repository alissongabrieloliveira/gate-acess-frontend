import { Search } from 'lucide-react'
import { useRef, useState } from 'react'
import { useRemoteSuggestions } from '../hooks/useRemoteSuggestions'
import SuggestionsDropdown from './SuggestionsDropdown'

/**
 * Campo "digite pra buscar e selecione" sobre um cadastro inteiro (busca no
 * servidor) — substitui <select>s que só listavam os primeiros 100
 * registros (anfitrião, motorista, guincho). Sem seleção mostra o campo de
 * busca; com seleção mostra o registro escolhido e "Trocar".
 *
 * `value` é o registro selecionado (ou null); `onChange(record | null)`.
 */
export default function RecordPicker({
  id,
  value,
  onChange,
  fetchItems,
  getLabel,
  renderItem,
  placeholder = 'Digite para buscar...',
  emptyText = 'Nenhum resultado encontrado.',
  minLength = 2,
  inputClassName,
  disabled = false,
}) {
  const [term, setTerm] = useState('')
  const [focused, setFocused] = useState(false)
  const inputRef = useRef(null)
  const { items, isLoading } = useRemoteSuggestions(term, { minLength, enabled: !value, fetchItems })

  if (value) {
    return (
      <div className={`${inputClassName} flex items-center justify-between gap-2`}>
        <span className="truncate font-semibold text-ink">{getLabel(value)}</span>
        {!disabled && (
          <button
            type="button"
            onClick={() => {
              onChange(null)
              setTerm('')
              // Volta o foco pro campo de busca que reaparece no próximo render.
              setTimeout(() => inputRef.current?.focus(), 0)
            }}
            className="shrink-0 text-xs font-semibold text-brand underline"
          >
            Trocar
          </button>
        )}
      </div>
    )
  }

  const showEmpty = focused && !isLoading && term.trim().length >= minLength && items.length === 0

  return (
    <div className="relative flex flex-col gap-1">
      <div className={`${inputClassName} flex items-center gap-1.5`}>
        <input
          id={id}
          ref={inputRef}
          type="text"
          value={term}
          disabled={disabled}
          onChange={(event) => setTerm(event.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          className="w-full bg-transparent placeholder:text-gray-400 focus:outline-none"
        />
        <Search className="size-4 shrink-0 text-gray-400" strokeWidth={1.75} />
      </div>
      {focused && (
        <SuggestionsDropdown
          items={items}
          renderItem={renderItem}
          onSelect={(record) => {
            onChange(record)
            setTerm('')
            inputRef.current?.blur()
          }}
        />
      )}
      {focused && isLoading && <p className="text-xs text-muted">Buscando...</p>}
      {showEmpty && <p className="text-xs text-muted">{emptyText}</p>}
    </div>
  )
}
