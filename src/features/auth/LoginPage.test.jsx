import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { useAuth } from '../../lib/auth'
import LoginPage from './LoginPage'

vi.mock('../../lib/auth', () => ({
  useAuth: vi.fn(),
}))

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal()
  return { ...actual, useNavigate: () => mockNavigate }
})

const REMEMBERED_EMAIL_KEY = 'portaria:rememberedEmail'

function renderLoginPage() {
  return render(
    <MemoryRouter>
      <LoginPage />
    </MemoryRouter>,
  )
}

describe('LoginPage', () => {
  beforeEach(() => {
    localStorage.clear()
    mockNavigate.mockClear()
  })

  test('restaura e-mail lembrado do localStorage e liga "lembrar usuário"', () => {
    localStorage.setItem(REMEMBERED_EMAIL_KEY, 'lembrado@teste.com')
    useAuth.mockReturnValue({ login: vi.fn() })

    renderLoginPage()

    expect(screen.getByLabelText('Usuário')).toHaveValue('lembrado@teste.com')
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'true')
  })

  test('submit chama login com e-mail e senha digitados, e navega em caso de sucesso', async () => {
    const login = vi.fn().mockResolvedValue(undefined)
    useAuth.mockReturnValue({ login })
    const user = userEvent.setup()

    renderLoginPage()
    await user.type(screen.getByLabelText('Usuário'), 'admin@empresa.com')
    await user.type(screen.getByLabelText('Senha'), 'MinhaSenha123')
    await user.click(screen.getByRole('button', { name: /entrar/i }))

    await waitFor(() => expect(login).toHaveBeenCalledWith('admin@empresa.com', 'MinhaSenha123'))
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true }))
  })

  test('mostra "Entrando..." e desabilita o botão enquanto o login está em voo', async () => {
    let resolveLogin
    const login = vi.fn(() => new Promise((resolve) => { resolveLogin = resolve }))
    useAuth.mockReturnValue({ login })
    const user = userEvent.setup()

    renderLoginPage()
    await user.type(screen.getByLabelText('Usuário'), 'admin@empresa.com')
    await user.type(screen.getByLabelText('Senha'), 'MinhaSenha123')
    await user.click(screen.getByRole('button', { name: /entrar/i }))

    expect(screen.getByRole('button', { name: /entrando/i })).toBeDisabled()

    resolveLogin()
    await waitFor(() => expect(mockNavigate).toHaveBeenCalled())
  })

  test('mostra a mensagem de erro vinda do backend (ex.: rate limit)', async () => {
    const login = vi
      .fn()
      .mockRejectedValue({ response: { data: { error: 'Muitas tentativas. Tente novamente mais tarde.' } } })
    useAuth.mockReturnValue({ login })
    const user = userEvent.setup()

    renderLoginPage()
    await user.type(screen.getByLabelText('Usuário'), 'admin@empresa.com')
    await user.type(screen.getByLabelText('Senha'), 'errada')
    await user.click(screen.getByRole('button', { name: /entrar/i }))

    expect(await screen.findByText('Muitas tentativas. Tente novamente mais tarde.')).toBeInTheDocument()
  })

  test('cai no fallback genérico quando o erro não tem mensagem do backend', async () => {
    const login = vi.fn().mockRejectedValue(new Error('network error'))
    useAuth.mockReturnValue({ login })
    const user = userEvent.setup()

    renderLoginPage()
    await user.type(screen.getByLabelText('Usuário'), 'admin@empresa.com')
    await user.type(screen.getByLabelText('Senha'), 'errada')
    await user.click(screen.getByRole('button', { name: /entrar/i }))

    expect(await screen.findByText('Credenciais inválidas.')).toBeInTheDocument()
  })

  test('"lembrar usuário" ligado -> salva o e-mail no localStorage após sucesso', async () => {
    const login = vi.fn().mockResolvedValue(undefined)
    useAuth.mockReturnValue({ login })
    const user = userEvent.setup()

    renderLoginPage()
    await user.type(screen.getByLabelText('Usuário'), 'lembrar@teste.com')
    await user.type(screen.getByLabelText('Senha'), 'senha123')
    await user.click(screen.getByRole('switch'))
    await user.click(screen.getByRole('button', { name: /entrar/i }))

    await waitFor(() => expect(localStorage.getItem(REMEMBERED_EMAIL_KEY)).toBe('lembrar@teste.com'))
  })

  test('"lembrar usuário" desligado -> remove o e-mail salvo do localStorage após sucesso', async () => {
    localStorage.setItem(REMEMBERED_EMAIL_KEY, 'anterior@teste.com')
    const login = vi.fn().mockResolvedValue(undefined)
    useAuth.mockReturnValue({ login })
    const user = userEvent.setup()

    renderLoginPage()
    // Nasce ligado por causa do valor salvo — desliga antes de submeter.
    await user.click(screen.getByRole('switch'))
    await user.clear(screen.getByLabelText('Usuário'))
    await user.type(screen.getByLabelText('Usuário'), 'novo@teste.com')
    await user.type(screen.getByLabelText('Senha'), 'senha123')
    await user.click(screen.getByRole('button', { name: /entrar/i }))

    await waitFor(() => expect(localStorage.getItem(REMEMBERED_EMAIL_KEY)).toBeNull())
  })
})
