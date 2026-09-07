import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../lib/auth'

const CHANGE_PASSWORD_PATH = '/change-password'

export default function ProtectedRoute() {
  const { user, isAuthenticated, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return <div className="flex min-h-screen items-center justify-center text-slate-500">Carregando...</div>
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  // Senha temporária (definida pelo admin na criação) ainda não trocada —
  // bloqueia acesso a qualquer outra rota até o usuário definir uma senha
  // só dele (ver claude.md/memoria.md: admin não deve deter a senha de uso
  // contínuo de ninguém).
  if (user.mustChangePassword && location.pathname !== CHANGE_PASSWORD_PATH) {
    return <Navigate to={CHANGE_PASSWORD_PATH} replace />
  }
  if (!user.mustChangePassword && location.pathname === CHANGE_PASSWORD_PATH) {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}
