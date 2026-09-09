import { AlertTriangle } from 'lucide-react'

// Fallback do Sentry.ErrorBoundary (ver main.jsx) — cobre erro de render do
// React que senão vira tela branca sem explicação nenhuma pro operador.
export default function ErrorFallback() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-page px-6 text-center font-sans">
      <div className="flex size-12 items-center justify-center rounded-full bg-red-50">
        <AlertTriangle className="size-6 text-red-600" strokeWidth={2.25} />
      </div>
      <div className="flex flex-col gap-1">
        <p className="text-lg font-extrabold text-ink">Ocorreu um erro inesperado</p>
        <p className="text-sm text-muted">
          Recarregue a página. Se o problema continuar, avise o suporte.
        </p>
      </div>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="rounded-lg bg-brand px-4 py-2 text-sm font-bold text-white"
      >
        Recarregar
      </button>
    </div>
  )
}
