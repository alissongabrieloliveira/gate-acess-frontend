import { ArrowLeft, ArrowRightToLine, Mail } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import AuthLayout from '../../components/AuthLayout'
import { api } from '../../lib/api'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)
    try {
      // Endpoint ainda não existe no backend (fora do escopo atual do claude.md) —
      // a chamada já está pronta pra quando ele for implementado.
      await api.post('/auth/forgot-password', { email })
      setSubmitted(true)
    } catch {
      setError('Não foi possível enviar as instruções agora. Tente novamente mais tarde.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AuthLayout>
      <div className="relative w-full max-w-[420px] rounded-2xl bg-white p-8 shadow-[0px_16px_16px_rgba(28,46,36,0.05)]">
        <div className="mb-7 flex flex-col gap-2">
          <h1 className="text-2xl font-bold text-ink">Recuperar senha</h1>
          <p className="text-sm leading-5 text-muted">
            Informe seu e-mail cadastrado para receber as instruções de recuperação de senha.
          </p>
        </div>

        {submitted ? (
          <p className="rounded-lg bg-brand-50 px-4 py-3 text-sm leading-5 text-brand">
            Se o e-mail informado estiver cadastrado, você receberá as instruções em instantes.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <label className="text-[13px] font-semibold text-ink" htmlFor="email">
                E-mail
              </label>
              <div className="flex h-[46px] items-center gap-2.5 rounded-lg border border-line px-3.5 focus-within:border-brand">
                <Mail className="size-[18px] shrink-0 text-muted" strokeWidth={1.75} />
                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="Digite seu e-mail"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
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
              {isSubmitting ? 'Enviando...' : 'Enviar instruções'}
              {!isSubmitting && <ArrowRightToLine className="size-4" strokeWidth={2.25} />}
            </button>
          </form>
        )}

        <Link
          to="/login"
          className="mt-5 flex items-center justify-center gap-1.5 text-[13px] font-semibold text-brand"
        >
          <ArrowLeft className="size-3.5" strokeWidth={2.25} />
          Voltar para o login
        </Link>
      </div>
    </AuthLayout>
  )
}
