import { useEffect, useRef, useState } from 'react'
import { subscribeLoading } from '../lib/loadingBar'

// Progresso "falso" (estilo GitHub/YouTube): cresce sozinho até 90% enquanto
// há requisição em voo, pula pra 100% quando termina e some em seguida.
// Substitui as mensagens "Carregando..." espalhadas pelas páginas — ver
// conversa com o usuário sobre lentidão percebida com o backend em nuvem.
const GROW_INTERVAL_MS = 200
const GROW_STEP = 4
const MAX_AUTO_PROGRESS = 90
const HIDE_DELAY_MS = 300

export default function TopProgressBar() {
  const [progress, setProgress] = useState(0)
  const [visible, setVisible] = useState(false)
  const intervalRef = useRef(null)
  const hideTimeoutRef = useRef(null)

  useEffect(() => {
    const unsubscribe = subscribeLoading((isLoading) => {
      clearInterval(intervalRef.current)
      clearTimeout(hideTimeoutRef.current)

      if (isLoading) {
        setVisible(true)
        setProgress(10)
        intervalRef.current = setInterval(() => {
          setProgress((current) => (current >= MAX_AUTO_PROGRESS ? current : current + GROW_STEP))
        }, GROW_INTERVAL_MS)
      } else {
        setProgress(100)
        hideTimeoutRef.current = setTimeout(() => {
          setVisible(false)
          setProgress(0)
        }, HIDE_DELAY_MS)
      }
    })

    return () => {
      unsubscribe()
      clearInterval(intervalRef.current)
      clearTimeout(hideTimeoutRef.current)
    }
  }, [])

  if (!visible) return null

  return (
    <div className="fixed inset-x-0 top-0 z-50 h-1 bg-transparent" aria-hidden="true">
      <div
        className="h-full bg-brand transition-[width] duration-300 ease-out"
        style={{ width: `${progress}%` }}
      />
    </div>
  )
}
