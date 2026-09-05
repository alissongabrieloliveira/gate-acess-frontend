import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'

export default function Layout() {
  return (
    <div className="flex h-screen items-start bg-canvas font-sans">
      <Sidebar />
      <main className="h-full flex-1 overflow-y-auto p-10">
        <Outlet />
      </main>
    </div>
  )
}
