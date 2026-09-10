import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './app/App.jsx'
import ErrorFallback from './components/ErrorFallback.jsx'
import { initInstallPromptCapture } from './lib/installPrompt.js'
import { initSentry, Sentry } from './lib/sentry.js'

initSentry()
// Precisa registrar antes do primeiro render — ver comentário em
// lib/installPrompt.js sobre por que isso não pode esperar um componente
// (Sidebar) montar.
initInstallPromptCapture()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Sentry.ErrorBoundary fallback={<ErrorFallback />}>
      <App />
    </Sentry.ErrorBoundary>
  </StrictMode>,
)

// Registrado só em produção — service worker + HMR do Vite não convivem bem em dev.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
  })
}
