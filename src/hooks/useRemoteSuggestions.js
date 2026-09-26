import { useEffect, useRef, useState } from 'react'

const DEBOUNCE_MS = 300
const EMPTY = { items: [], isLoading: false }

/**
 * Sugestões buscadas no SERVIDOR (ex.: GET /people?search=) enquanto o
 * operador digita — substitui o filtro sobre uma amostra de "até 100"
 * cadastros carregada no cliente, que não achava ninguém além dela.
 * Espera o operador parar de digitar e descarta respostas atrasadas (de um
 * termo que já mudou). `enabled: false` limpa e não busca.
 */
export function useRemoteSuggestions(term, { minLength = 2, enabled = true, fetchItems }) {
  // Resultado da última busca concluída e o termo a que ele pertence —
  // "carregando" é derivado (termo atual ainda sem resultado).
  const [result, setResult] = useState({ term: null, items: [] })
  // Atualizado num efeito declarado ANTES do de busca (efeitos rodam na ordem),
  // então a busca sempre usa a versão mais recente.
  const fetchRef = useRef(fetchItems)
  useEffect(() => {
    fetchRef.current = fetchItems
  })

  const trimmed = term.trim()
  const active = enabled && trimmed.length >= minLength

  useEffect(() => {
    if (!active) return undefined
    let cancelled = false
    const timer = setTimeout(async () => {
      let items = []
      try {
        items = await fetchRef.current(trimmed)
      } catch {
        // Sugestão é só conveniência: falhou, não sugere nada.
      }
      if (!cancelled) setResult({ term: trimmed, items })
    }, DEBOUNCE_MS)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [trimmed, active])

  if (!active) return EMPTY
  // Enquanto o termo novo carrega, mantém as sugestões anteriores na tela.
  return { items: result.items, isLoading: result.term !== trimmed }
}
