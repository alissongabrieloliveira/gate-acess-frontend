import { useCallback, useEffect, useState } from 'react'

// Captura o `beforeinstallprompt` (Chrome/Edge/Android) pra oferecer um botão
// de instalação próprio, em vez de depender do mini-infobar automático do
// navegador (que só aparece sozinho conforme heurística de engajamento dele,
// não é garantido aparecer num tablet novo configurado uma única vez — ver
// claude.md seção 8). Sem suporte no Safari/iOS — lá não existe essa API,
// instalação continua manual via "Adicionar à Tela de Início".
export function useInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null)

  useEffect(() => {
    function handleBeforeInstallPrompt(event) {
      event.preventDefault()
      setDeferredPrompt(event)
    }
    function handleAppInstalled() {
      setDeferredPrompt(null)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  const promptInstall = useCallback(async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    await deferredPrompt.userChoice
    // O evento capturado só serve pra um prompt — aceito ou recusado, o
    // navegador só gera outro `beforeinstallprompt` num carregamento de
    // página futuro, então descarta a referência aqui.
    setDeferredPrompt(null)
  }, [deferredPrompt])

  return { canInstall: !!deferredPrompt, promptInstall }
}
