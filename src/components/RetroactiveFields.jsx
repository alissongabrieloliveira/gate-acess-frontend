import { History } from 'lucide-react'
import { OPERATOR_MAX_DAYS, REASON_MAX } from '../lib/retroactive'

const inputClass =
  'w-full rounded-lg border border-gray-200 px-2.5 py-2 text-[13px] text-ink focus:border-brand focus:outline-none'
const labelClass = 'text-xs font-semibold text-gray-700'

/** Campo de data/hora de um lançamento retroativo (limites de retroactiveBounds). */
export function RetroactiveDateTime({ label, value, onChange, bounds }) {
  return (
    <div className="flex flex-col gap-1">
      <label className={labelClass}>{label} *</label>
      <input
        type="datetime-local"
        value={value}
        min={bounds.min}
        max={bounds.max}
        onChange={(event) => onChange(event.target.value)}
        className={inputClass}
      />
    </div>
  )
}

/**
 * Caixa "Lançamento retroativo" das telas de operação: desligada, a passagem
 * é registrada agora (como sempre); ligada, mostra os campos de data/hora
 * (`children`) e o motivo obrigatório. O registro fica com o selo "Retroativo".
 */
export default function RetroactiveFields({ checked, onCheckedChange, reason, onReasonChange, isAdmin, title, children }) {
  return (
    <div className={`flex flex-col gap-3 rounded-[10px] border p-3 ${checked ? 'border-amber-200 bg-amber-50' : 'border-gray-200'}`}>
      <label className="flex cursor-pointer items-center gap-2 text-[13px] font-semibold text-ink">
        <input
          type="checkbox"
          checked={checked}
          onChange={(event) => onCheckedChange(event.target.checked)}
          className="size-4 accent-brand"
        />
        <History className="size-4 text-gray-500" strokeWidth={2} />
        {title}
      </label>
      {checked && (
        <>
          <p className="text-xs text-muted">
            Para registrar uma passagem que não foi lançada na hora.
            {isAdmin ? '' : ` Até ${OPERATOR_MAX_DAYS} dias atrás — mais antigo, peça a um administrador.`} O
            registro fica marcado como retroativo.
          </p>
          {children}
          <div className="flex flex-col gap-1">
            <label className={labelClass}>Motivo do lançamento retroativo *</label>
            <textarea
              value={reason}
              maxLength={REASON_MAX}
              onChange={(event) => onReasonChange(event.target.value)}
              placeholder="Ex.: esqueci de registrar na correria do turno"
              rows={2}
              className={`${inputClass} resize-none`}
            />
          </div>
        </>
      )}
    </div>
  )
}

/** Selo "Retroativo" das listas e telas de detalhe. */
export function RetroactiveBadge({ className = '' }) {
  return (
    <span
      title="Lançado depois do horário da passagem"
      className={`inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-800 ${className}`}
    >
      <History className="size-3" strokeWidth={2.5} />
      Retroativo
    </span>
  )
}

/**
 * Quadro das telas de detalhe: cada passagem lançada depois, com o motivo e
 * quando foi lançada de fato. `items`: [{ label, reason, recordedAt, masculine? }] — só
 * entram os que têm motivo.
 */
export function RetroactiveDetails({ items }) {
  const retro = items.filter((item) => item.reason)
  if (retro.length === 0) return null
  return (
    <div className="flex flex-col gap-2 rounded-[10px] border border-amber-200 bg-amber-50 p-3">
      <RetroactiveBadge className="w-fit" />
      {retro.map((item) => (
        <p key={item.label} className="text-[13px] text-gray-700">
          <span className="font-semibold text-ink">{item.label}</span>
          {item.recordedAt &&
            ` ${item.masculine ? 'lançado' : 'lançada'} em ${new Date(item.recordedAt).toLocaleString('pt-BR')}`}
          : {item.reason}
        </p>
      ))}
    </div>
  )
}
