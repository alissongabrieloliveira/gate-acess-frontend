import { useCallback, useEffect, useState } from 'react'
import { consumeDeferredPrompt, getDeferredPrompt, subscribe } from '../lib/installPrompt'

// Oferece um botão de instalação próprio, em vez de depender só do
// mini-infobar automático do navegador (que só aparece sozinho conforme
// heurística de engajamento dele, não é garantido aparecer num tablet novo
// configurado uma única vez — ver claude.md seção 8). Sem suporte no
// Safari/iOS — lá não existe essa API, instalação continua manual via
// "Adicionar à Tela de Início".
//
// A captura de verdade do evento vive em lib/installPrompt.js (registrada
// em main.jsx, antes do primeiro render) — este hook só lê o estado atual
// dessa store e se inscreve pra reagir a mudanças, não escuta o evento
// diretamente (se escutasse aqui, perderia o evento sempre que ele disparar
// antes do Sidebar montar, que é o caso comum: acontece ainda na tela de
// login).
export function useInstallPrompt() {
  const [prompt, setPrompt] = useState(getDeferredPrompt)

  useEffect(() => subscribe(setPrompt), [])

  const promptInstall = useCallback(async () => {
    const current = consumeDeferredPrompt()
    if (!current) return
    current.prompt()
    await current.userChoice
  }, [])

  return { canInstall: !!prompt, promptInstall }
}
