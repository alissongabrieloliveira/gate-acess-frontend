// Service worker básico do PWA (claude.md seção 8).
// Assets com hash no nome (JS/CSS gerados pelo Vite em /assets/*) em
// cache-first — são imutáveis por definição (hash muda se o conteúdo muda),
// então servir do cache é sempre seguro e rápido. `index.html`/`/` em
// network-first: diferente dos assets, a URL NUNCA muda entre deploys, mas o
// CONTEÚDO muda (referencia os hashes novos) — cache-first aqui prendia o
// usuário na versão antiga do app pra sempre depois do primeiro carregamento,
// já que um deploy novo nunca invalidava essa entrada específica do cache
// (achado em produção: admin via "Somente leitura" numa feature que já
// tinha sido liberada pra admin havia dias — o navegador nunca buscou o
// `index.html`/bundle novos). Chamadas de API continuam network-first com
// fallback pro cache, já que registro de entrada/saída precisa de dado
// atualizado sempre que houver conexão.
//
// Fila offline (IndexedDB) ainda não implementada — ver memoria.md, decisão pendente
// de SERIAL vs UUID nas PKs antes de fazer sync idempotente.

// Versão nova (v1 -> v2) de propósito: força o `activate` abaixo a descartar
// o cache antigo (que já tinha `index.html`/`/` presos em versões velhas) em
// vez de só herdar o que já estava lá.
const APP_SHELL_CACHE = 'app-shell-v2'
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

  // `mode: 'navigate'` cobre toda carga de página (inclusive refresh numa
  // rota do React Router tipo /settings — o Vercel devolve o mesmo
  // `index.html` via rewrite de SPA, ver vercel.json), não só '/' — por
  // isso checar o modo em vez de comparar `url.pathname` contra uma lista
  // fixa de caminhos.
  if (isApiRequest(url)) {
    event.respondWith(networkFirst(event.request))
  } else if (event.request.mode === 'navigate') {
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
