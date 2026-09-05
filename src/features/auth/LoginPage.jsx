import { ArrowRightToLine, Eye, EyeOff, Shield, ShieldCheck, User, UserKey } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ToggleSwitch from '../../components/ToggleSwitch'
import { useAuth } from '../../lib/auth'

const REMEMBERED_EMAIL_KEY = 'portaria:rememberedEmail'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [error, setError] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    const rememberedEmail = localStorage.getItem(REMEMBERED_EMAIL_KEY)
    if (rememberedEmail) {
      setEmail(rememberedEmail)
      setRememberMe(true)
    }
  }, [])

  async function handleSubmit(event) {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)
    try {
      await login(email, password)
      if (rememberMe) {
        localStorage.setItem(REMEMBERED_EMAIL_KEY, email)
      } else {
        localStorage.removeItem(REMEMBERED_EMAIL_KEY)
      }
      navigate('/', { replace: true })
    } catch {
      setError('Credenciais inválidas.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="relative flex min-h-screen flex-col items-start justify-between overflow-hidden bg-page px-6 py-6 font-sans md:px-12">
      <BackgroundIllustration />

      <header className="flex w-full items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex size-9 items-center justify-center rounded-lg bg-brand">
            <ShieldCheck className="size-5 text-white" strokeWidth={2.25} />
          </div>
          <div className="flex flex-col">
            <p className="text-lg font-extrabold leading-tight text-ink">PORTARIA</p>
            <p className="text-[11px] font-semibold uppercase leading-tight text-muted">
              Controle de Acesso
            </p>
          </div>
        </div>
      </header>

      <div className="flex w-full flex-1 items-center justify-center py-10">
        <form
          onSubmit={handleSubmit}
          className="relative w-full max-w-[420px] rounded-2xl bg-white p-8 shadow-[0px_16px_16px_rgba(28,46,36,0.05)]"
        >
          <div className="mb-7 flex flex-col gap-2">
            <h1 className="text-2xl font-bold text-ink">Entrar no sistema</h1>
            <p className="text-sm leading-snug text-muted">
              Insira suas credenciais abaixo para acessar o painel de controle da portaria.
            </p>
          </div>

          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <label className="text-[13px] font-semibold text-ink" htmlFor="email">
                Usuário
              </label>
              <div className="flex h-[46px] items-center gap-2.5 rounded-lg border border-line px-3.5 focus-within:border-brand">
                <User className="size-[18px] shrink-0 text-muted" strokeWidth={1.75} />
                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="username"
                  placeholder="Digite seu e-mail"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="w-full text-sm text-ink placeholder:text-muted focus:outline-none"
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[13px] font-semibold text-ink" htmlFor="password">
                Senha
              </label>
              <div className="flex h-[46px] items-center gap-2.5 rounded-lg border border-line px-3.5 focus-within:border-brand">
                <UserKey className="size-[18px] shrink-0 text-muted" strokeWidth={1.75} />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="w-full text-sm text-ink placeholder:text-muted focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  className="shrink-0 text-muted hover:text-ink"
                >
                  {showPassword ? (
                    <EyeOff className="size-[18px]" strokeWidth={1.75} />
                  ) : (
                    <Eye className="size-[18px]" strokeWidth={1.75} />
                  )}
                </button>
              </div>
            </div>
          </div>

          <div className="mt-5 flex items-center justify-between">
            <ToggleSwitch checked={rememberMe} onChange={setRememberMe} label="Lembrar usuário" />
            <button
              type="button"
              title="Recuperação de senha ainda não disponível"
              className="text-[13px] font-semibold text-brand underline decoration-from-font"
            >
              Esqueci a senha
            </button>
          </div>

          {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-7 flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-brand text-[15px] font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {isSubmitting ? 'Entrando...' : 'Entrar'}
            {!isSubmitting && <ArrowRightToLine className="size-4" strokeWidth={2.25} />}
          </button>
        </form>
      </div>

      <footer className="flex w-full items-center justify-between">
        <span className="rounded-md bg-brand-50 px-2 py-1 text-[11px] font-bold text-brand">
          v1.0.0
        </span>
      </footer>
    </div>
  )
}

function BackgroundIllustration() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute right-0 top-1/2 hidden h-[600px] w-[480px] -translate-y-1/2 items-center justify-center opacity-65 lg:flex"
    >
      <div className="flex h-[480px] w-[320px] items-center justify-center rounded-b-2xl rounded-t-[160px] border-2 border-line p-6">
        <div className="flex h-[400px] w-60 items-center justify-center rounded-b-lg rounded-t-[120px] border border-line p-6">
          <Shield className="size-20 text-line" strokeWidth={1.25} />
        </div>
      </div>
    </div>
  )
}
