import { BrowserRouter, Route, Routes } from 'react-router-dom'
import Layout from '../components/Layout'
import AccessControlPage from '../features/access-control/AccessControlPage'
import AccessLogDetailPage from '../features/access-control/AccessLogDetailPage'
import AccessLogEditPage from '../features/access-control/AccessLogEditPage'
import ChangePasswordPage from '../features/auth/ChangePasswordPage'
import ForgotPasswordPage from '../features/auth/ForgotPasswordPage'
import LoginPage from '../features/auth/LoginPage'
import ControlPostsPage from '../features/control-posts/ControlPostsPage'
import DashboardPage from '../features/dashboard/DashboardPage'
import FleetLogDetailPage from '../features/fleet/FleetLogDetailPage'
import FleetLogEditPage from '../features/fleet/FleetLogEditPage'
import FleetPage from '../features/fleet/FleetPage'
import PeoplePage from '../features/people/PeoplePage'
import AuditLogsPage from '../features/reports/AuditLogsPage'
import LoginLogsPage from '../features/reports/LoginLogsPage'
import SettingsPage from '../features/settings/SettingsPage'
import UsersPage from '../features/users/UsersPage'
import VehiclesPage from '../features/vehicles/VehiclesPage'
import { AuthProvider } from '../lib/auth'
import ProtectedRoute from './ProtectedRoute'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />

          <Route element={<ProtectedRoute />}>
            {/* Fora do <Layout> de propósito — sem sidebar, mesma casca visual do
                login (AuthLayout), já que o usuário ainda não tem acesso liberado
                ao resto do app enquanto mustChangePassword for true. */}
            <Route path="/change-password" element={<ChangePasswordPage />} />
            <Route element={<Layout />}>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/access-control" element={<AccessControlPage />} />
              <Route path="/access-control/:id" element={<AccessLogDetailPage />} />
              <Route path="/access-control/:id/edit" element={<AccessLogEditPage />} />
              <Route path="/fleet" element={<FleetPage />} />
              <Route path="/fleet/:id" element={<FleetLogDetailPage />} />
              <Route path="/fleet/:id/edit" element={<FleetLogEditPage />} />
              <Route path="/vehicles" element={<VehiclesPage />} />
              <Route path="/people" element={<PeoplePage />} />
              <Route path="/users" element={<UsersPage />} />
              <Route path="/control-posts" element={<ControlPostsPage />} />
              <Route path="/reports/audit-logs" element={<AuditLogsPage />} />
              <Route path="/reports/login-logs" element={<LoginLogsPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
