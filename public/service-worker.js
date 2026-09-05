// Service worker básico do PWA (claude.md seção 8).
// App shell em cache-first para carregamento instantâneo; chamadas de API (dinâmicas)
// em network-first com fallback pro cache, já que registro de entrada/saída precisa
// de dado atualizado sempre que houver conexão.
//
// Fila offline (IndexedDB) ainda não implementada — ver memoria.md, decisão pendente
// de SERIAL vs UUID nas PKs antes de fazer sync idempotente.

const APP_SHELL_CACHE = 'app-shell-v1'
const APP_SHELL_URLS = ['/', '/index.html', '/manifest.json']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(APP_SHELL_CACHE).then((cache) => cache.addAll(APP_SHELL_URLS)),
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== APP_SHELL_CACHE).map((key) => caches.delete(key))),
      ),
  )
  self.clients.claim()
})

function isApiRequest(url) {
  return url.pathname.startsWith('/api/')
}

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)
  if (event.request.method !== 'GET') return

  if (isApiRequest(url)) {
    event.respondWith(networkFirst(event.request))
  } else {
    event.respondWith(cacheFirst(event.request))
  }
})

async function cacheFirst(request) {
  const cached = await caches.match(request)
  if (cached) return cached
  const response = await fetch(request)
  const cache = await caches.open(APP_SHELL_CACHE)
  cache.put(request, response.clone())
  return response
}

async function networkFirst(request) {
  try {
    const response = await fetch(request)
    const cache = await caches.open(APP_SHELL_CACHE)
    cache.put(request, response.clone())
    return response
  } catch (error) {
    const cached = await caches.match(request)
    if (cached) return cached
    throw error
  }
}
