import { ArrowRightToLine, KeyRound } from 'lucide-react'
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import AuthLayout from '../../components/AuthLayout'
import { api } from '../../lib/api'
import { getErrorMessage } from '../../lib/errors'

const inputClass =
  'flex h-[46px] items-center gap-2.5 rounded-lg border border-line px-3.5 focus-within:border-brand'
const fieldInputClass = 'w-full text-sm text-ink placeholder:text-muted focus:outline-none'

/**
 * Aberta a partir do link enviado por e-mail em ForgotPasswordPage.jsx —
 * sem sessão nenhuma (useAuth não se aplica aqui: quem chega aqui provou
 * posse da conta pelo token na URL, não por estar logado). Ao contrário de
 * ChangePasswordPage.jsx (troca obrigatória no primeiro login, loga
 * automaticamente depois), aqui só mostra sucesso + link pro login — mais
 * simples, e o endpoint de reset não devolve token de sessão nenhum.
 */
export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setError(null)
    if (password !== confirmPassword) {
      setError('A confirmação não confere com a nova senha.')
      return
    }

    setIsSubmitting(true)
    try {
      await api.post('/auth/reset-password', { token, password })
      setSubmitted(true)
    } catch (err) {
      setError(getErrorMessage(err, 'Não foi possível redefinir a senha agora.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AuthLayout>
      <div className="relative w-full max-w-[420px] rounded-2xl bg-white p-8 shadow-[0px_16px_16px_rgba(28,46,36,0.05)]">
        {!token ? (
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <h1 className="text-2xl font-bold text-ink">Link inválido</h1>
              <p className="text-sm leading-5 text-muted">
                Este link de recuperação de senha é inválido ou está incompleto. Solicite um novo.
              </p>
            </div>
            <Link to="/forgot-password" className="flex items-center justify-center gap-1.5 text-[13px] font-semibold text-brand">
              Solicitar novo link
            </Link>
          </div>
        ) : submitted ? (
          <div className="flex flex-col gap-5">
            <h1 className="text-2xl font-bold text-ink">Senha redefinida</h1>
            <p className="rounded-lg bg-brand-50 px-4 py-3 text-sm leading-5 text-brand">
              Sua senha foi alterada com sucesso. Você já pode entrar com a nova senha.
            </p>
            <Link to="/login" className="flex items-center justify-center gap-1.5 text-[13px] font-semibold text-brand">
              Ir para o login
            </Link>
          </div>
        ) : (
          <>
            <div className="mb-7 flex flex-col gap-2">
              <div className="flex size-11 items-center justify-center rounded-lg bg-brand-50">
                <KeyRound className="size-5 text-brand" strokeWidth={2} />
              </div>
              <h1 className="mt-1 text-2xl font-bold text-ink">Definir nova senha</h1>
              <p className="text-sm leading-snug text-muted">Escolha uma nova senha para a sua conta.</p>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <label className="text-[13px] font-semibold text-ink" htmlFor="password">
                  Nova senha
                </label>
                <div className={inputClass}>
                  <input
                    id="password"
                    type="password"
                    required
                    autoComplete="new-password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className={fieldInputClass}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-[13px] font-semibold text-ink" htmlFor="confirmPassword">
                  Confirmar nova senha
                </label>
                <div className={inputClass}>
                  <input
                    id="confirmPassword"
                    type="password"
                    required
                    autoComplete="new-password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    className={fieldInputClass}
                  />
                </div>
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <button
                type="submit"
                disabled={isSubmitting}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-brand text-[15px] font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {isSubmitting ? 'Salvando...' : 'Redefinir senha'}
                {!isSubmitting && <ArrowRightToLine className="size-4" strokeWidth={2.25} />}
              </button>
            </form>
          </>
        )}
      </div>
    </AuthLayout>
  )
}
