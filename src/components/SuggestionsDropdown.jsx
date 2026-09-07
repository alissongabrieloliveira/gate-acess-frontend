export const MAX_SUGGESTIONS = 5

/**
 * Dropdown de sugestões (busca inteligente) — filtra um array já carregado
 * (ex.: `lookups.people`/`lookups.vehicles`, amostra parcial de até 100
 * registros) direto no cliente, sem round-trip nenhum. Usado em mais de um
 * slide-over (Controle de Acessos, Controle de Frota), por isso mora em
 * components/ em vez de dentro de uma única feature.
 */
export default function SuggestionsDropdown({ items, renderItem, onSelect }) {
  if (items.length === 0) return null
  return (
    <div className="absolute left-0 right-0 top-full z-10 mt-1 max-h-52 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          // onMouseDown (não onClick) com preventDefault: impede o input de
          // perder foco antes do clique ser processado — sem isso o dropdown
          // desmonta no blur e o clique nunca chega a disparar.
          onMouseDown={(event) => {
            event.preventDefault()
            onSelect(item)
          }}
          className="flex w-full flex-col gap-0.5 border-b border-gray-100 px-3 py-2 text-left last:border-b-0 hover:bg-gray-50"
        >
          {renderItem(item)}
        </button>
      ))}
    </div>
  )
}
