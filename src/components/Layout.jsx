import { Menu, ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'

// Abaixo de `lg` não há espaço pra sidebar fixa de 260px — esse cabeçalho
// (hambúrguer + logo) some em telas maiores, onde a Sidebar já é a coluna
// estática de sempre.
function MobileTopBar({ onOpenMenu }) {
  return (
    <div className="flex items-center gap-3 border-b border-gray-200 bg-white px-4 py-3 lg:hidden">
      <button
        type="button"
        onClick={onOpenMenu}
        aria-label="Abrir menu"
        className="text-ink hover:text-brand"
      >
        <Menu className="size-6" strokeWidth={2} />
      </button>
      <div className="flex items-center gap-2">
        <div className="flex size-7 items-center justify-center rounded-lg bg-brand-50">
          <ShieldCheck className="size-4 text-brand" strokeWidth={2.25} />
        </div>
        <p className="text-base font-extrabold leading-tight text-ink">PORTARIA</p>
      </div>
    </div>
  )
}

export default function Layout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  return (
    <div className="flex h-screen items-start bg-canvas font-sans">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      {/* Backdrop só existe (e só fecha ao clicar) enquanto a gaveta está
          aberta — em `lg+` isSidebarOpen nunca chega a virar true (não há
          botão de abrir visível lá), então isso nunca renderiza no desktop. */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      <div className="flex h-full flex-1 flex-col overflow-hidden">
        <MobileTopBar onOpenMenu={() => setIsSidebarOpen(true)} />
        <main className="h-full flex-1 overflow-y-auto p-4 sm:p-6 lg:p-10">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
