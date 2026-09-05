import { X } from 'lucide-react'

export default function SlideOver({ title, subtitle, onClose, children, footer }) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/10">
      <div className="flex h-full w-full max-w-[576px] flex-col bg-white shadow-[-8px_0px_12px_rgba(0,0,0,0.04)]">
        <div className="flex items-center justify-between border-b border-gray-200 p-6">
          <div className="flex flex-col gap-1">
            <h2 className="text-lg font-bold text-ink">{title}</h2>
            {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="flex size-8 items-center justify-center rounded-2xl border border-gray-200 text-muted hover:bg-gray-50"
          >
            <X className="size-4" strokeWidth={2} />
          </button>
        </div>

        <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">{children}</div>

        {footer && <div className="flex gap-3 border-t border-gray-200 p-4">{footer}</div>}
      </div>
    </div>
  )
}
