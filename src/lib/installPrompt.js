// Captura `beforeinstallprompt` fora do ciclo de vida do React — precisa
// registrar o listener o quanto antes (chamado direto em main.jsx, antes do
// primeiro render), porque o evento pode disparar muito cedo, inclusive na
// tela de login (antes de qualquer componente autenticado — como o Sidebar,
// onde o botão "Instalar aplicativo" mora — ter chance de montar). Perdido
// uma vez, o Chrome não dispara de novo na mesma navegação: um hook que só
// escuta a partir do momento em que monta simplesmente nunca veria o evento
// se ele já tivesse disparado antes (achado em teste manual real).
let deferredPrompt = null
const listeners = new Set()

function notify() {
  listeners.forEach((listener) => listener(deferredPrompt))
}

export function initInstallPromptCapture() {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault()
    deferredPrompt = event
    notify()
  })
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null
    notify()
  })
}

export function getDeferredPrompt() {
  return deferredPrompt
}

// Usado só na hora de instalar — o prompt do Chrome só serve uma vez (aceito
// ou recusado, só surge outro `beforeinstallprompt` num carregamento futuro),
// por isso consome (limpa) a referência ao ler.
export function consumeDeferredPrompt() {
  const current = deferredPrompt
  deferredPrompt = null
  notify()
  return current
}

export function subscribe(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
