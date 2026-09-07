import { useState } from 'react'
import SlideOver from '../../components/SlideOver'
import ToggleSwitch from '../../components/ToggleSwitch'
import { api } from '../../lib/api'
import { getErrorMessage } from '../../lib/errors'
import { formatCpf } from '../../lib/format'
import { RULES } from '../../lib/rules'

const inputClass =
  'w-full rounded-lg border border-gray-200 px-2.5 py-2 text-[13px] text-ink focus:border-brand focus:outline-none disabled:bg-gray-100 disabled:text-muted'
const labelClass = 'text-xs font-semibold text-gray-600'

function StepBadge({ number }) {
  return (
    <span className="flex size-6 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-xs font-bold text-brand">
      {number}
    </span>
  )
}

/**
 * Cria ou edita um operador (POST/PUT /users). Só admin acessa esta tela
 * (rota /users, sidebar já esconde o link — o backend também barra 403 se
 * chamado sem permissão). Senha é obrigatória na criação, opcional na
 * edição (mesmo texto de ajuda já usado em Configurações: "deixe em branco
 * para manter a senha atual"). "Ativo" só aparece editando — usuário novo
 * já nasce ativo por padrão no banco (não faz sentido criar já inativo).
 */
export default function UserFormDrawer({ user, onClose, onSaved }) {
  const [name, setName] = useState(user?.name ?? '')
  const [cpf, setCpf] = useState(formatCpf(user?.cpf))
  const [email, setEmail] = useState(user?.email ?? '')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isAdmin, setIsAdmin] = useState(!!(user && user.rules & RULES.ADMIN))
  const [isActive, setIsActive] = useState(user?.isActive ?? true)
  const [error, setError] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const isEditing = !!user
  const canSubmit =
    name.trim().length > 0 && cpf.replace(/\D/g, '').length > 0 && email.trim().length > 0 && (isEditing || password)

  async function handleSubmit(event) {
    event.preventDefault()
    setError(null)
    if (!canSubmit) {
      setError(isEditing ? 'Nome, CPF e e-mail são obrigatórios.' : 'Nome, CPF, e-mail e senha são obrigatórios.')
      return
    }
    if (password && password !== confirmPassword) {
      setError('A confirmação não confere com a senha.')
      return
    }

    setIsSubmitting(true)
    try {
      const payload = {
        name: name.trim(),
        // CPF não é normalizado pelo backend (fica salvo exatamente como
        // chega) — envia só os dígitos, mesmo tratamento já usado em
        // Pessoas.
        cpf: cpf.replace(/\D/g, ''),
        email: email.trim(),
        rules: isAdmin ? RULES.ADMIN : 0,
      }
      if (password) payload.password = password

      if (isEditing) {
        await api.patch(`/users/${user.id}`, { ...payload, isActive })
      } else {
        await api.post('/users', payload)
      }

      onSaved()
    } catch (err) {
      setError(getErrorMessage(err, 'Não foi possível salvar o usuário.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <SlideOver
      title={isEditing ? 'Editar Usuário' : 'Novo Usuário'}
      subtitle={isEditing ? name : 'Cadastre um novo operador do sistema.'}
      onClose={onClose}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-[13px] font-semibold text-gray-700 hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="user-form"
            disabled={isSubmitting || !canSubmit}
            className="flex-1 rounded-lg bg-brand px-4 py-2.5 text-[13px] font-semibold text-brand-50 hover:opacity-90 disabled:opacity-50"
          >
            {isSubmitting ? 'Salvando...' : 'Salvar Usuário'}
          </button>
        </>
      }
    >
      <form id="user-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-1.5">
            <StepBadge number={1} />
            <p className="text-[13px] font-bold text-ink">Dados do Usuário</p>
          </div>

          <div className="flex flex-col gap-1">
            <label className={labelClass}>Nome *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Nome completo"
              className={inputClass}
            />
          </div>

          <div className="flex gap-2">
            <div className="flex flex-1 flex-col gap-1">
              <label className={labelClass}>CPF *</label>
              <input
                type="text"
                required
                value={cpf}
                onChange={(event) => setCpf(formatCpf(event.target.value))}
                placeholder="123.456.789-10"
                className={inputClass}
              />
            </div>
            <div className="flex flex-1 flex-col gap-1">
              <label className={labelClass}>E-mail *</label>
              <input
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="nome@empresa.com.br"
                className={inputClass}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5 rounded-lg border border-gray-200 p-3">
            <label className={labelClass}>{isEditing ? 'Nova Senha' : 'Senha *'}</label>
            {isEditing && <p className="text-[11px] text-muted">Deixe em branco para manter a senha atual.</p>}
            <input
              type="password"
              required={!isEditing}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="new-password"
              className={inputClass}
            />
            {password && (
              <>
                <label className={`${labelClass} mt-1`}>Confirmar Senha</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  autoComplete="new-password"
                  className={inputClass}
                />
              </>
            )}
          </div>

          <div className="flex flex-col gap-3 rounded-lg border border-gray-200 p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex flex-col gap-0.5">
                <p className={labelClass}>Administrador</p>
                <p className="text-[11px] text-muted">Acesso total ao sistema, incluindo gestão de usuários.</p>
              </div>
              <ToggleSwitch checked={isAdmin} onChange={setIsAdmin} />
            </div>

            {isEditing && (
              <div className="flex items-center justify-between gap-3 border-t border-gray-100 pt-3">
                <div className="flex flex-col gap-0.5">
                  <p className={labelClass}>Ativo</p>
                  <p className="text-[11px] text-muted">Usuário inativo não consegue mais fazer login.</p>
                </div>
                <ToggleSwitch checked={isActive} onChange={setIsActive} />
              </div>
            )}
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
      </form>
    </SlideOver>
  )
}
