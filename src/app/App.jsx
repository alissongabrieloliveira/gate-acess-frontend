import { BrowserRouter, Route, Routes } from 'react-router-dom'
import Layout from '../components/Layout'
import AccessControlPage from '../features/access-control/AccessControlPage'
import AccessLogDetailPage from '../features/access-control/AccessLogDetailPage'
import ForgotPasswordPage from '../features/auth/ForgotPasswordPage'
import LoginPage from '../features/auth/LoginPage'
import ControlPostsPage from '../features/control-posts/ControlPostsPage'
import DashboardPage from '../features/dashboard/DashboardPage'
import FleetPage from '../features/fleet/FleetPage'
import PeoplePage from '../features/people/PeoplePage'
import ReportsPage from '../features/reports/ReportsPage'
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
            <Route element={<Layout />}>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/access-control" element={<AccessControlPage />} />
              <Route path="/access-control/:id" element={<AccessLogDetailPage />} />
              <Route path="/fleet" element={<FleetPage />} />
              <Route path="/vehicles" element={<VehiclesPage />} />
              <Route path="/people" element={<PeoplePage />} />
              <Route path="/users" element={<UsersPage />} />
              <Route path="/control-posts" element={<ControlPostsPage />} />
              <Route path="/reports" element={<ReportsPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
