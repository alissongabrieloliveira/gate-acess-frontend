import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import ProtectedRoute from '../../app/ProtectedRoute'
import { api } from '../../lib/api'
import { useAuth } from '../../lib/auth'
import { PRIVACY_NOTICE_VERSION } from '../../lib/privacyNotice'
import PrivacyNoticePage from './PrivacyNoticePage'

vi.mock('../../lib/auth', () => ({ useAuth: vi.fn() }))
vi.mock('../../lib/api', () => ({
  api: {
    get: vi.fn(() => Promise.resolve({ data: { trade_name: 'Mibasa', privacy_contact: 'privacidade@mibasa.com' } })),
    post: vi.fn(() => Promise.resolve({ data: {} })),
  },
}))

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal()
  return { ...actual, useNavigate: () => mockNavigate }
})

describe('PrivacyNoticePage', () => {
  beforeEach(() => {
    mockNavigate.mockClear()
    api.post.mockClear()
  })

  test('pendente: só continua depois de marcar a ciência, e manda a versão vigente', async () => {
    const refreshAccessToken = vi.fn(() => Promise.resolve())
    useAuth.mockReturnValue({ user: { userId: 3, privacyNoticePending: true }, refreshAccessToken, logout: vi.fn() })
    render(
      <MemoryRouter>
        <PrivacyNoticePage />
      </MemoryRouter>,
    )

    expect(await screen.findByText(/privacidade@mibasa.com/)).toBeInTheDocument()
    const button = screen.getByRole('button', { name: 'Continuar' })
    expect(button).toBeDisabled()

    await userEvent.click(screen.getByLabelText(/Li o aviso/))
    await userEvent.click(button)

    expect(api.post).toHaveBeenCalledWith('/users/me/privacy-notice', { version: PRIVACY_NOTICE_VERSION })
    await waitFor(() => expect(refreshAccessToken).toHaveBeenCalled())
    expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true })
  })

  test('ProtectedRoute leva ao aviso enquanto estiver pendente', () => {
    useAuth.mockReturnValue({
      user: { userId: 3, mustChangePassword: false, privacyNoticePending: true },
      isAuthenticated: true,
      isLoading: false,
    })
    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<p>Dashboard</p>} />
            <Route path="/privacy-notice" element={<p>Tela do aviso</p>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    )
    expect(screen.getByText('Tela do aviso')).toBeInTheDocument()
  })

  test('troca de senha pendente vem antes do aviso', () => {
    useAuth.mockReturnValue({
      user: { userId: 3, mustChangePassword: true, privacyNoticePending: true },
      isAuthenticated: true,
      isLoading: false,
    })
    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<p>Dashboard</p>} />
            <Route path="/change-password" element={<p>Tela da senha</p>} />
            <Route path="/privacy-notice" element={<p>Tela do aviso</p>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    )
    expect(screen.getByText('Tela da senha')).toBeInTheDocument()
  })
})
