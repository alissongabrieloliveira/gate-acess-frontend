import { ArrowRightToLine, KeyRound, LogOut } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AuthLayout from '../../components/AuthLayout'
import { api } from '../../lib/api'
import { useAuth } from '../../lib/auth'
import { getErrorMessage } from '../../lib/errors'

/**
 * Tela obrigatória de primeiro login: o usuário foi criado por um admin com
 * uma senha temporária (que o admin conhece) e precisa definir uma senha só
 * dele antes de acessar qualquer outra parte do sistema — decisão de
 * segurança documentada em memoria.md (admin não deve deter/poder redefinir
 * a senha de uso contínuo de ninguém). `ProtectedRoute` redireciona pra cá
 * sempre que `user.mustChangePassword` for true, e pra fora daqui assim que
 * deixar de ser.
 */
export default function ChangePasswordPage() {
  const { user, refreshAccessToken, logout } = useAuth()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setError(null)
    if (password !== confirmPassword) {
      setError('A confirmação não confere com a nova senha.')
      return
    }

    setIsSubmitting(true)
    try {
      await api.patch(`/users/${user.userId}`, { password })
      // O access token atual ainda carrega mustChangePassword=true (foi
      // emitido antes da troca) — precisa de um token novo pra liberar o
      // resto do app; o ProtectedRoute reage assim que o contexto atualizar.
      await refreshAccessToken()
      navigate('/', { replace: true })
    } catch (err) {
      setError(getErrorMessage(err, 'Não foi possível definir a senha agora.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AuthLayout>
      <div className="relative w-full max-w-[420px] rounded-2xl bg-white p-8 shadow-[0px_16px_16px_rgba(28,46,36,0.05)]">
        <div className="mb-7 flex flex-col gap-2">
          <div className="flex size-11 items-center justify-center rounded-lg bg-brand-50">
            <KeyRound className="size-5 text-brand" strokeWidth={2} />
          </div>
          <h1 className="mt-1 text-2xl font-bold text-ink">Defina sua senha</h1>
          <p className="text-sm leading-snug text-muted">
            Sua conta foi criada com uma senha temporária. Por segurança, defina agora uma senha que só você
            conhece — nem mesmo o administrador terá acesso a ela.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <label className="text-[13px] font-semibold text-ink" htmlFor="password">
              Nova senha
            </label>
            <div className="flex h-[46px] items-center gap-2.5 rounded-lg border border-line px-3.5 focus-within:border-brand">
              <input
                id="password"
                type="password"
                required
                autoComplete="new-password"
                placeholder="••••••••"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full text-sm text-ink placeholder:text-muted focus:outline-none"
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[13px] font-semibold text-ink" htmlFor="confirmPassword">
              Confirmar nova senha
            </label>
            <div className="flex h-[46px] items-center gap-2.5 rounded-lg border border-line px-3.5 focus-within:border-brand">
              <input
                id="confirmPassword"
                type="password"
                required
                autoComplete="new-password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className="w-full text-sm text-ink placeholder:text-muted focus:outline-none"
              />
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={isSubmitting}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-brand text-[15px] font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {isSubmitting ? 'Salvando...' : 'Definir senha e continuar'}
            {!isSubmitting && <ArrowRightToLine className="size-4" strokeWidth={2.25} />}
          </button>
        </form>

        <button
          type="button"
          onClick={logout}
          className="mt-5 flex w-full items-center justify-center gap-1.5 text-[13px] font-semibold text-muted hover:text-ink"
        >
          <LogOut className="size-3.5" strokeWidth={2.25} />
          Sair
        </button>
      </div>
    </AuthLayout>
  )
}
