import { AlertTriangle } from 'lucide-react'
import { useEffect, useRef } from 'react'

export function KmUnavailableCheckbox({ checked, onChange }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-xs text-gray-600">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="size-4 accent-brand"
      />
      KM indisponível (painel quebrado ou ilegível)
    </label>
  )
}

/**
 * Feedback do KM logo abaixo do campo (não no rodapé do drawer, que rola e
 * deixa a mensagem fora da tela): ou o erro que bloqueia, ou o aviso de
 * plausibilidade — que não bloqueia, mas só libera depois de o operador
 * marcar que conferiu. Rola até a mensagem quando ela aparece.
 */
export function KmFeedbackMessage({ error, warning, acknowledged, onAcknowledge }) {
  const ref = useRef(null)

  useEffect(() => {
    if (error || warning) ref.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [error, warning])

  if (error) {
    return (
      <p ref={ref} role="alert" className="text-[13px] font-semibold text-red-600">
        {error}
      </p>
    )
  }
  if (!warning) return null

  return (
    <div ref={ref} role="alert" className="flex flex-col gap-2 rounded-[10px] border border-amber-200 bg-amber-100 p-3">
      <div className="flex items-start gap-2.5">
        <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-800" strokeWidth={1.75} />
        <p className="text-[13px] font-semibold text-amber-800">{warning}</p>
      </div>
      <label className="flex cursor-pointer items-center gap-2 text-[13px] text-amber-800">
        <input
          type="checkbox"
          checked={acknowledged}
          onChange={(event) => onAcknowledge(event.target.checked)}
          className="size-4 accent-brand"
        />
        Conferi e o KM está correto
      </label>
    </div>
  )
}
