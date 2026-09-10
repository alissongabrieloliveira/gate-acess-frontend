import { Building2, Lock, User } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import SuggestionsDropdown from '../../components/SuggestionsDropdown'
import { formatCityLabel, useCitySearch } from '../../hooks/useCitySearch'
import { api } from '../../lib/api'
import { useAuth } from '../../lib/auth'
import { getErrorMessage } from '../../lib/errors'
import { formatCnpj, formatCpf, formatPhone, isValidCnpj, isValidCpf } from '../../lib/format'
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

function formatAddress(company) {
  const parts = []
  if (company.street) {
    const number = company.address_number ? `, ${company.address_number}` : ''
    const complement = company.complement ? ` - ${company.complement}` : ''
    parts.push(`${company.street}${number}${complement}`)
  }
  if (company.neighborhood) parts.push(company.neighborhood)
  if (company.city_name) parts.push(`${company.city_name} - ${company.state ?? company.city_state_abbr}`)
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

  // "Dados da Empresa" — só admin edita (ver isAdmin abaixo); o form fica
  // populado mesmo pra operador, só não é renderizado nesse caso (evita
  // ramificar o `useEffect` de carga inicial por role, sem custo real).
  const [corporateName, setCorporateName] = useState('')
  const [tradeName, setTradeName] = useState('')
  const [companyCnpj, setCompanyCnpj] = useState('')
  const [zipCode, setZipCode] = useState('')
  const [street, setStreet] = useState('')
  const [addressNumber, setAddressNumber] = useState('')
  const [complement, setComplement] = useState('')
  const [neighborhood, setNeighborhood] = useState('')
  const [ufFallback, setUfFallback] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [cityQuery, setCityQuery] = useState('')
  const [selectedCityId, setSelectedCityId] = useState(null)
  const [cityFocused, setCityFocused] = useState(false)
  const [companyError, setCompanyError] = useState(null)
  const [companySuccess, setCompanySuccess] = useState(false)
  const [isSavingCompany, setIsSavingCompany] = useState(false)
  const cityInputRef = useRef(null)

  useEffect(() => {
    if (!profile) return
    setName(profile.name ?? '')
    setCpf(formatCpf(profile.cpf))
    setEmail(profile.email ?? '')
  }, [profile])

  useEffect(() => {
    if (!company) return
    setCorporateName(company.corporate_name ?? '')
    setTradeName(company.trade_name ?? '')
    setCompanyCnpj(formatCnpj(company.cnpj))
    setZipCode(company.zip_code ?? '')
    setStreet(company.street ?? '')
    setAddressNumber(company.address_number ?? '')
    setComplement(company.complement ?? '')
    setNeighborhood(company.neighborhood ?? '')
    setUfFallback(company.state ?? '')
    setContactEmail(company.contact_email ?? '')
    setContactPhone(formatPhone(company.contact_phone))
    setSelectedCityId(company.city_id ?? null)
    setCityQuery(
      company.city_id && company.city_name
        ? formatCityLabel({ name: company.city_name, stateAbbr: company.city_state_abbr })
        : '',
    )
  }, [company])

  const citySuggestions = useCitySearch(cityQuery)

  function selectCity(city) {
    setSelectedCityId(city.id)
    setCityQuery(formatCityLabel(city))
    cityInputRef.current?.blur()
  }

  const companyCnpjDigits = companyCnpj.replace(/\D/g, '')
  const companyCnpjIsValid = isValidCnpj(companyCnpjDigits)

  async function handleCompanySubmit(event) {
    event.preventDefault()
    setCompanyError(null)
    setCompanySuccess(false)

    if (!corporateName.trim()) {
      setCompanyError('Razão social é obrigatória.')
      return
    }
    if (!companyCnpjIsValid) {
      setCompanyError('CNPJ inválido.')
      return
    }

    setIsSavingCompany(true)
    try {
      await api.put('/companies/me', {
        corporateName,
        tradeName: tradeName || null,
        cnpj: companyCnpjDigits,
        zipCode: zipCode || null,
        street: street || null,
        addressNumber: addressNumber || null,
        complement: complement || null,
        neighborhood: neighborhood || null,
        cityId: selectedCityId,
        // Só envia UF manual quando não há cidade selecionada — com
        // cityId preenchido, o trigger do Postgres (trg_companies_sync_state)
        // sobrescreve `state` com o UF real da cidade escolhida de qualquer
        // forma, então mandar os dois só confundiria sobre qual "venceu".
        state: selectedCityId ? undefined : ufFallback || null,
        contactEmail: contactEmail || null,
        contactPhone: contactPhone.replace(/\D/g, '') || null,
      })
      await refetch()
      setCompanySuccess(true)
    } catch (err) {
      setCompanyError(getErrorMessage(err, 'Não foi possível salvar os dados da empresa.'))
    } finally {
      setIsSavingCompany(false)
    }
  }

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

        {company && !isAdmin && (
          <div className="flex shrink-0 flex-col gap-3 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <CardHeader
              icon={<Building2 className="size-4 text-ink" strokeWidth={1.75} />}
              title="Dados da Empresa"
              subtitle="Cadastro do tenant — edição restrita a administradores."
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

        {company && isAdmin && (
          <form
            onSubmit={handleCompanySubmit}
            className="flex shrink-0 flex-col gap-3 rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
          >
            <CardHeader
              icon={<Building2 className="size-4 text-ink" strokeWidth={1.75} />}
              title="Dados da Empresa"
              subtitle="Cadastro do tenant — como administrador, você pode editar."
            />

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className={labelClass}>Razão Social</label>
                <input
                  value={corporateName}
                  onChange={(e) => setCorporateName(e.target.value)}
                  required
                  className={inputClass}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className={labelClass}>Nome Fantasia</label>
                <input value={tradeName} onChange={(e) => setTradeName(e.target.value)} className={inputClass} />
              </div>
              <div className="flex flex-col gap-1">
                <label className={labelClass}>CNPJ</label>
                <input
                  value={companyCnpj}
                  onChange={(e) => setCompanyCnpj(formatCnpj(e.target.value))}
                  required
                  className={inputClass}
                />
                {companyCnpjDigits.length === 14 && !companyCnpjIsValid && (
                  <p className="text-xs text-red-600">CNPJ inválido</p>
                )}
              </div>
              <div className="flex flex-col gap-1">
                <label className={labelClass}>E-mail de Contato</label>
                <input
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className={labelClass}>Telefone de Contato</label>
                <input
                  value={contactPhone}
                  onChange={(e) => setContactPhone(formatPhone(e.target.value))}
                  className={inputClass}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className={labelClass}>CEP</label>
                <input
                  value={zipCode}
                  onChange={(e) => setZipCode(e.target.value.replace(/\D/g, '').slice(0, 8))}
                  className={inputClass}
                />
              </div>
            </div>

            <hr className="border-gray-200" />

            <div className="flex flex-col gap-3">
              <p className="text-[13px] font-bold text-ink">Endereço</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className={labelClass}>Rua</label>
                  <input value={street} onChange={(e) => setStreet(e.target.value)} className={inputClass} />
                </div>
                <div className="flex flex-col gap-1">
                  <label className={labelClass}>Número</label>
                  <input
                    value={addressNumber}
                    onChange={(e) => setAddressNumber(e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className={labelClass}>Complemento</label>
                  <input value={complement} onChange={(e) => setComplement(e.target.value)} className={inputClass} />
                </div>
                <div className="flex flex-col gap-1">
                  <label className={labelClass}>Bairro</label>
                  <input
                    value={neighborhood}
                    onChange={(e) => setNeighborhood(e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div className="relative flex flex-col gap-1">
                  <label className={labelClass}>Cidade</label>
                  <input
                    ref={cityInputRef}
                    value={cityQuery}
                    onChange={(e) => {
                      setCityQuery(e.target.value)
                      setSelectedCityId(null)
                    }}
                    onFocus={() => setCityFocused(true)}
                    onBlur={() => setCityFocused(false)}
                    placeholder="Buscar cidade..."
                    className={inputClass}
                  />
                  {cityFocused && (
                    <SuggestionsDropdown
                      items={citySuggestions}
                      onSelect={selectCity}
                      renderItem={(city) => (
                        <span className="text-[13px] font-semibold text-ink">{formatCityLabel(city)}</span>
                      )}
                    />
                  )}
                </div>
                <div className="flex flex-col gap-1">
                  <label className={labelClass}>UF</label>
                  <input
                    value={ufFallback}
                    onChange={(e) => setUfFallback(e.target.value.toUpperCase().slice(0, 2))}
                    disabled={!!selectedCityId}
                    placeholder={selectedCityId ? undefined : 'Ex.: SP'}
                    className={`${inputClass} disabled:bg-gray-100 disabled:text-muted`}
                  />
                  {selectedCityId && (
                    <p className="text-xs text-muted">Preenchido automaticamente pela cidade selecionada.</p>
                  )}
                </div>
              </div>
            </div>

            {companyError && <p className="text-sm text-red-600">{companyError}</p>}
            {companySuccess && <p className="text-sm text-green-600">Dados da empresa salvos com sucesso.</p>}

            <div className="flex items-center justify-end">
              <button
                type="submit"
                disabled={isSavingCompany || !companyCnpjIsValid}
                className="rounded-[10px] bg-brand px-4 py-2 text-sm font-bold text-white hover:opacity-90 disabled:opacity-50"
              >
                {isSavingCompany ? 'Salvando...' : 'Salvar Dados da Empresa'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
