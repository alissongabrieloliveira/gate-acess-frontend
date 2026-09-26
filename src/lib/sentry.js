import * as Sentry from '@sentry/react'

// LGPD: a query string pode levar CPF/nome/placa (buscas da API) ou o token
// de redefinição de senha (/reset-password?token=...). Nada disso vai pro
// Sentry — a URL segue só com o caminho.
export function stripQuery(url) {
  if (typeof url !== 'string') return url
  const queryStart = url.indexOf('?')
  return queryStart === -1 ? url : `${url.slice(0, queryStart)}?[redacted]`
}

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
    beforeSend: scrubEvent,
    beforeBreadcrumb: scrubBreadcrumb,
  })
}

export function scrubEvent(event) {
  if (event.request?.url) event.request.url = stripQuery(event.request.url)
  if (event.request?.query_string) delete event.request.query_string
  return event
}

export function scrubBreadcrumb(breadcrumb) {
  const data = breadcrumb.data
  if (data) {
    for (const key of ['url', 'from', 'to']) {
      if (data[key]) data[key] = stripQuery(data[key])
    }
  }
  return breadcrumb
}

export { Sentry }
