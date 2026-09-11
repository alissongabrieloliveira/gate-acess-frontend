// Store de progresso de requisições HTTP, fora do ciclo do React — mesmo
// padrão de lib/installPrompt.js. api.js chama requestStarted()/requestEnded()
// nos interceptors do axios; TopProgressBar só se inscreve pra saber se há
// pelo menos uma requisição em voo.
let activeRequests = 0
const listeners = new Set()

function notify() {
  const isLoading = activeRequests > 0
  listeners.forEach((listener) => listener(isLoading))
}

export function requestStarted() {
  activeRequests += 1
  if (activeRequests === 1) notify()
}

export function requestEnded() {
  activeRequests = Math.max(0, activeRequests - 1)
  if (activeRequests === 0) notify()
}

export function subscribeLoading(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
