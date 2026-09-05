import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../lib/auth'

export default function ProtectedRoute() {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return <div className="flex min-h-screen items-center justify-center text-slate-500">Carregando...</div>
  }

  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />
}
