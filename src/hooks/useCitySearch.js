import { useEffect, useState } from 'react'
import { MAX_SUGGESTIONS } from '../components/SuggestionsDropdown'
import { api } from '../lib/api'

/**
 * `cities` tem ~5.570 municípios — grande demais pro padrão "carrega até 100
 * de uma vez e filtra no cliente" usado pra vehicles/people/gates neste
 * projeto. Por isso é busca de verdade no servidor (`GET /cities?search=`),
 * com debounce, em vez de um lookup client-side sobre uma amostra. Extraído
 * de fleet/DepartureDrawer.jsx pra ser reaproveitado em settings também.
 */
export function useCitySearch(query) {
  const [results, setResults] = useState([])

  useEffect(() => {
    const term = query.trim()
    if (term.length < 2) {
      setResults([])
      return
    }
    const timer = setTimeout(async () => {
      try {
        const { data } = await api.get('/cities', { params: { search: term, limit: MAX_SUGGESTIONS } })
        setResults(data.data)
      } catch {
        setResults([])
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [query])

  return results
}

export function formatCityLabel(city) {
  return `${city.name} - ${city.stateAbbr}`
}
