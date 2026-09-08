import { Building2, Lock, User } from 'lucide-react'
import { useEffect, useState } from 'react'
import { api } from '../../lib/api'
import { useAuth } from '../../lib/auth'
import { getErrorMessage } from '../../lib/errors'
import { formatCpf, isValidCpf } from '../../lib/format'
import { RULES } from '../../lib/rules'
import { useSettingsData } from './useSettingsData'

const inputClass =
  'h-10 w-full rounded-[10px] border border-gray-200 px-3.5 text-sm font-semibold text-ink focus:border-brand focus:outline-none'
const labelClass = 'text-[11px] font-semibold uppercase text-subtle'

function CardHeader({ icon, title, subtitle, badge }) {
  return (
    <div className="flex items-start justify-between">
      <div className="flex flex-col gap-0.5">
        <div className="flex items-center gap-2">
          {icon}
          <p className="text-base font-bold text-ink">{title}</p>
        </div>
        <p className="text-[13px] text-muted">{subtitle}</p>
      </div>
      {badge}
    </div>
  )
}

function Field({ label, value }) {
  return (
    <div className="flex flex-col gap-1">
      <p className={labelClass}>{label}</p>
      <p className="text-sm text-ink">{value ?? '—'}</p>
    </div>
  )
}

function formatCnpj(value) {
  if (!value || value.length !== 14) return value ?? '—'
  return value.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
}

function formatAddress(company) {
  const parts = []
  if (company.street) {
    const number = company.address_number ? `, ${company.address_number}` : ''
    const complement = company.complement ? ` - ${company.complement}` : ''
    parts.push(`${company.street}${number}${complement}`)
  }
  if (company.neighborhood) parts.push(company.neighborhood)
  if (company.zip_code) parts.push(`CEP ${company.zip_code}`)
  return parts.length ? parts.join(' • ') : null
}

export default function SettingsPage() {
  const { refreshUser } = useAuth()
  const { isLoading, error, profile, company, refetch } = useSettingsData()

  const [name, setName] = useState('')
  const [cpf, setCpf] = useState('')
  const [email, setEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [submitError, setSubmitError] = useState(null)
  const [submitSuccess, setSubmitSuccess] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!profile) return
    setName(profile.name ?? '')
    setCpf(formatCpf(profile.cpf))
    setEmail(profile.email ?? '')
  }, [profile])

  const cpfDigits = cpf.replace(/\D/g, '')
  // CPF de users é obrigatório (diferente de people) — mesmo critério já
  // usado em UserFormDrawer.
  const cpfIsValid = isValidCpf(cpfDigits)

  async function handleSubmit(event) {
    event.preventDefault()
    setSubmitError(null)
    setSubmitSuccess(false)

    if (!cpfIsValid) {
      setSubmitError('CPF inválido.')
      return
    }
    if (newPassword && newPassword !== confirmPassword) {
      setSubmitError('A confirmação não confere com a nova senha.')
      return
    }

    setIsSubmitting(true)
    try {
      // CPF não é normalizado pelo backend (fica salvo exatamente como
      // chega) — envia só os dígitos, mesmo tratamento já usado no resto
      // do app.
      const payload = { name, cpf: cpfDigits, email }
      if (newPassword) payload.password = newPassword

      await api.patch(`/users/${profile.id}`, payload)
      await Promise.all([refreshUser(), refetch()])
      setNewPassword('')
      setConfirmPassword('')
      setSubmitSuccess(true)
    } catch (err) {
      setSubmitError(getErrorMessage(err, 'Não foi possível salvar as alterações.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const isAdmin = !!(profile && profile.rules & RULES.ADMIN)

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-col gap-0.5">
        <h1 className="text-xl font-bold text-ink">Configurações</h1>
        <p className="text-[13px] text-muted">Gerencie seu perfil de acesso e veja os dados da empresa.</p>
      </div>

      {isLoading && <p className="text-sm text-muted">Carregando...</p>}
      {error && (
        <p className="text-sm text-red-600">Não foi possível carregar suas informações. Tente novamente mais tarde.</p>
      )}

      {/* Página nunca rola (main já rola por padrão no Layout) — se o conteúdo
          não couber mesmo compacto, esta faixa rola internamente, não a página. */}
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto">
        {profile && (
          <form
            onSubmit={handleSubmit}
            className="flex shrink-0 flex-col gap-3 rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
          >
            <CardHeader
              icon={<User className="size-4 text-ink" strokeWidth={1.75} />}
              title="Meu Perfil"
              subtitle="Dados usados para o seu login no sistema."
              badge={
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                    isAdmin ? 'bg-brand-50 text-brand' : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {isAdmin ? 'Administrador' : 'Operador'}
                </span>
              }
            />

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className={labelClass}>Nome Completo</label>
                <input value={name} onChange={(e) => setName(e.target.value)} required className={inputClass} />
              </div>
              <div className="flex flex-col gap-1">
                <label className={labelClass}>CPF</label>
                <input value={cpf} onChange={(e) => setCpf(formatCpf(e.target.value))} required className={inputClass} />
                {cpfDigits.length === 11 && !cpfIsValid && <p className="text-xs text-red-600">CPF inválido</p>}
              </div>
              <div className="flex flex-col gap-1">
                <label className={labelClass}>E-mail</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className={inputClass}
                />
              </div>
            </div>

            <hr className="border-gray-200" />

            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <Lock className="size-4 text-ink" strokeWidth={1.75} />
                <p className="text-[13px] font-bold text-ink">Alterar Senha</p>
              </div>
              <p className="-mt-1 text-xs text-muted">Deixe em branco para manter a senha atual.</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className={labelClass}>Nova Senha</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className={inputClass}
                    autoComplete="new-password"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className={labelClass}>Confirmar Nova Senha</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={inputClass}
                    autoComplete="new-password"
                  />
                </div>
              </div>
            </div>

            {submitError && <p className="text-sm text-red-600">{submitError}</p>}
            {submitSuccess && <p className="text-sm text-green-600">Alterações salvas com sucesso.</p>}

            <div className="flex items-center justify-end">
              <button
                type="submit"
                disabled={isSubmitting || !cpfIsValid}
                className="rounded-[10px] bg-brand px-4 py-2 text-sm font-bold text-white hover:opacity-90 disabled:opacity-50"
              >
                {isSubmitting ? 'Salvando...' : 'Salvar Alterações'}
              </button>
            </div>
          </form>
        )}

        {company && (
          <div className="flex shrink-0 flex-col gap-3 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <CardHeader
              icon={<Building2 className="size-4 text-ink" strokeWidth={1.75} />}
              title="Dados da Empresa"
              subtitle="Cadastro do tenant — gerenciado fora do aplicativo."
              badge={<span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-bold text-gray-600">Somente leitura</span>}
            />

            <div className="grid grid-cols-2 gap-3">
              <Field label="Razão Social" value={company.corporate_name} />
              <Field label="Nome Fantasia" value={company.trade_name} />
              <Field label="CNPJ" value={formatCnpj(company.cnpj)} />
              <Field label="UF" value={company.state} />
              <Field label="E-mail de Contato" value={company.contact_email} />
              <Field label="Telefone de Contato" value={company.contact_phone} />
              <div className="col-span-2">
                <Field label="Endereço" value={formatAddress(company)} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
