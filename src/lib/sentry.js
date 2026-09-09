import * as Sentry from '@sentry/react'

// Opcional (mesmo critério do backend, ver backend/src/utils/sentry.js) —
// sem VITE_SENTRY_DSN, simplesmente não inicializa, sem quebrar o build/boot.
// Sem `tracesSampleRate`/integrações de performance de propósito — este
// módulo cobre rastreamento de erro, não monitoramento de performance.
export function initSentry() {
  const dsn = import.meta.env.VITE_SENTRY_DSN
  if (!dsn) return

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
  })
}

export { Sentry }
