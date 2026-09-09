import {
  Ban,
  Car,
  ChevronDown,
  DoorClosed,
  Download,
  FileText,
  FolderOpen,
  History,
  LayoutGrid,
  LogIn,
  LogOut,
  MapPin,
  Settings,
  Shield,
  ShieldCheck,
  Truck,
  User,
  Users,
} from 'lucide-react'
import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useInstallPrompt } from '../hooks/useInstallPrompt'
import { useAuth } from '../lib/auth'
import { RULES } from '../lib/rules'

const REGISTRY_PATHS = ['/vehicles', '/people', '/users', '/control-posts', '/sectors']
const REPORTS_PATHS = [
  '/reports/access-logs',
  '/reports/fleet-logs',
  '/reports/blocked-people',
  '/reports/sector-visits',
  '/reports/audit-logs',
  '/reports/login-logs',
]

const navItemClass = ({ isActive }) =>
  `flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm ${
    isActive ? 'bg-brand-50 font-semibold text-brand' : 'font-medium text-gray-700 hover:bg-gray-100'
  }`

const subNavItemClass = ({ isActive }) =>
  `flex items-center gap-3 rounded-lg py-2.5 pl-[38px] pr-4 text-[13px] ${
    isActive ? 'bg-brand-50 font-semibold text-brand' : 'font-medium text-gray-700 hover:bg-gray-100'
  }`

export default function Sidebar() {
  const { user, logout } = useAuth()
  const { canInstall, promptInstall } = useInstallPrompt()
  const location = useLocation()
  const [registryOpen, setRegistryOpen] = useState(
    REGISTRY_PATHS.some((path) => location.pathname.startsWith(path)),
  )
  const [reportsOpen, setReportsOpen] = useState(
    REPORTS_PATHS.some((path) => location.pathname.startsWith(path)),
  )

  const isAdmin = !!(user?.rules & RULES.ADMIN)
  const initials = user?.name
    ? user.name
        .split(' ')
        .slice(0, 2)
        .map((part) => part[0])
        .join('')
        .toUpperCase()
    : '--'

  return (
    <aside className="flex h-full w-[260px] shrink-0 flex-col justify-between border-r border-gray-200 bg-canvas px-4 py-6">
      <div className="flex flex-col gap-8">
        <div className="flex items-center gap-2.5 pl-2">
          <div className="flex size-9 items-center justify-center rounded-lg bg-brand-50">
            <ShieldCheck className="size-5 text-brand" strokeWidth={2.25} />
          </div>
          <div className="flex flex-col">
            <p className="text-lg font-extrabold leading-tight text-ink">PORTARIA</p>
            <p className="text-[11px] font-semibold uppercase leading-tight text-muted">
              Controle de Acesso
            </p>
          </div>
        </div>

        <nav className="flex flex-col gap-1">
          <NavLink to="/" end className={navItemClass}>
            <LayoutGrid className="size-[18px]" strokeWidth={2} />
            Dashboard
          </NavLink>
          <NavLink to="/access-control" className={navItemClass}>
            <DoorClosed className="size-[18px]" strokeWidth={2} />
            Controle de Acessos
          </NavLink>
          <NavLink to="/fleet" className={navItemClass}>
            <Truck className="size-[18px]" strokeWidth={2} />
            Controle de Frota
          </NavLink>

          <button
            type="button"
            onClick={() => setRegistryOpen((value) => !value)}
            className="flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100"
          >
            <FolderOpen className="size-[18px]" strokeWidth={2} />
            <span className="flex-1 text-left">Cadastros</span>
            <ChevronDown
              className={`size-3.5 transition-transform ${registryOpen ? 'rotate-180' : ''}`}
              strokeWidth={2.25}
            />
          </button>
          {registryOpen && (
            <div className="flex flex-col gap-0.5">
              <NavLink to="/vehicles" className={subNavItemClass}>
                <Car className="size-[18px]" strokeWidth={1.75} />
                Veículos
              </NavLink>
              <NavLink to="/people" className={subNavItemClass}>
                <Users className="size-[18px]" strokeWidth={1.75} />
                Pessoas
              </NavLink>
              {isAdmin && (
                <NavLink to="/users" className={subNavItemClass}>
                  <User className="size-[18px]" strokeWidth={1.75} />
                  Usuários
                </NavLink>
              )}
              <NavLink to="/control-posts" className={subNavItemClass}>
                <Shield className="size-[18px]" strokeWidth={1.75} />
                Postos de Controle
              </NavLink>
              <NavLink to="/sectors" className={subNavItemClass}>
                <MapPin className="size-[18px]" strokeWidth={1.75} />
                Setores
              </NavLink>
            </div>
          )}

          <button
            type="button"
            onClick={() => setReportsOpen((value) => !value)}
            className="flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100"
          >
            <FileText className="size-[18px]" strokeWidth={2} />
            <span className="flex-1 text-left">Relatórios</span>
            <ChevronDown
              className={`size-3.5 transition-transform ${reportsOpen ? 'rotate-180' : ''}`}
              strokeWidth={2.25}
            />
          </button>
          {reportsOpen && (
            <div className="flex flex-col gap-0.5">
              <NavLink to="/reports/access-logs" className={subNavItemClass}>
                <DoorClosed className="size-[18px]" strokeWidth={1.75} />
                Acessos
              </NavLink>
              <NavLink to="/reports/fleet-logs" className={subNavItemClass}>
                <Truck className="size-[18px]" strokeWidth={1.75} />
                Frota
              </NavLink>
              <NavLink to="/reports/blocked-people" className={subNavItemClass}>
                <Ban className="size-[18px]" strokeWidth={1.75} />
                Pessoas Bloqueadas
              </NavLink>
              <NavLink to="/reports/sector-visits" className={subNavItemClass}>
                <MapPin className="size-[18px]" strokeWidth={1.75} />
                Visitas por Setor
              </NavLink>
              {/* Auditoria/Login são admin-only no backend
                  (authorize(RULES.ADMIN) em audit-logs.routes.js/
                  login-logs.routes.js) — só esses dois itens ficam
                  escondidos de operadores, mesmo critério de Usuários
                  dentro de Cadastros (o restante de Relatórios é leitura
                  aberta, igual Controle de Acessos/Frota/Pessoas). */}
              {isAdmin && (
                <>
                  <NavLink to="/reports/audit-logs" className={subNavItemClass}>
                    <History className="size-[18px]" strokeWidth={1.75} />
                    Auditoria
                  </NavLink>
                  <NavLink to="/reports/login-logs" className={subNavItemClass}>
                    <LogIn className="size-[18px]" strokeWidth={1.75} />
                    Login
                  </NavLink>
                </>
              )}
            </div>
          )}
          <NavLink to="/settings" className={navItemClass}>
            <Settings className="size-[18px]" strokeWidth={2} />
            Configurações
          </NavLink>
        </nav>
      </div>

      <div className="flex flex-col gap-3">
        {/* Só renderiza quando o navegador de fato disparou o
            `beforeinstallprompt` (Chrome/Edge/Android — ver
            hooks/useInstallPrompt.js) — some sozinho depois de instalado ou
            em navegadores sem suporte (Safari/iOS), sem checagem manual de
            "já está instalado" nem persistência de dispensa. */}
        {canInstall && (
          <button
            type="button"
            onClick={promptInstall}
            className="flex items-center justify-center gap-2 rounded-[10px] bg-brand-50 px-3 py-2.5 text-sm font-semibold text-brand hover:bg-brand/10"
          >
            <Download className="size-4" strokeWidth={2} />
            Instalar aplicativo
          </button>
        )}

        <div className="flex items-center gap-3 rounded-[10px] border-t border-gray-200 bg-white p-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand text-xs font-bold text-white">
            {initials}
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <p className="truncate text-sm font-semibold text-ink">{user?.name ?? '...'}</p>
            <p className="truncate text-[11px] font-medium text-gray-500">
              {isAdmin ? 'Administrador' : 'Operador'}
            </p>
          </div>
          <button
            type="button"
            onClick={logout}
            aria-label="Sair"
            title="Sair"
            className="shrink-0 text-gray-500 hover:text-ink"
          >
            <LogOut className="size-4" strokeWidth={2} />
          </button>
        </div>
      </div>
    </aside>
  )
}
