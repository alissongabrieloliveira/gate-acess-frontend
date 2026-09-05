import { BrowserRouter, Route, Routes } from 'react-router-dom'
import Layout from '../components/Layout'
import AccessControlPage from '../features/access-control/AccessControlPage'
import AdminPage from '../features/admin/AdminPage'
import LoginPage from '../features/auth/LoginPage'
import FleetPage from '../features/fleet/FleetPage'
import PeoplePage from '../features/people/PeoplePage'
import VehiclesPage from '../features/vehicles/VehiclesPage'
import { AuthProvider } from '../lib/auth'
import ProtectedRoute from './ProtectedRoute'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route path="/" element={<AccessControlPage />} />
              <Route path="/fleet" element={<FleetPage />} />
              <Route path="/people" element={<PeoplePage />} />
              <Route path="/vehicles" element={<VehiclesPage />} />
              <Route path="/admin" element={<AdminPage />} />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
