import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { RULES } from '../lib/rules'

const navLinkClass = ({ isActive }) =>
  `rounded px-3 py-2 text-sm font-medium ${
    isActive ? 'bg-slate-800 text-white' : 'text-slate-600 hover:bg-slate-200'
  }`

export default function Layout() {
  const { user, logout } = useAuth()
  const isAdmin = !!(user?.rules & RULES.ADMIN)

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
        <div className="flex gap-1">
          <NavLink to="/" end className={navLinkClass}>
            Acesso
          </NavLink>
          <NavLink to="/fleet" className={navLinkClass}>
            Frota
          </NavLink>
          <NavLink to="/people" className={navLinkClass}>
            Pessoas
          </NavLink>
          <NavLink to="/vehicles" className={navLinkClass}>
            Veículos
          </NavLink>
          {isAdmin && (
            <NavLink to="/admin" className={navLinkClass}>
              Admin
            </NavLink>
          )}
        </div>
        <button
          onClick={logout}
          className="rounded px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200"
        >
          Sair
        </button>
      </nav>
      <main className="p-6">
        <Outlet />
      </main>
    </div>
  )
}
