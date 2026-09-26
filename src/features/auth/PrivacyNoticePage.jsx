import { ArrowLeft, ArrowRightToLine, LogOut, ShieldCheck } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AuthLayout from '../../components/AuthLayout'
import { api } from '../../lib/api'
import { useAuth } from '../../lib/auth'
import { getErrorMessage } from '../../lib/errors'
import { formatPhone } from '../../lib/format'
import { PRIVACY_NOTICE_VERSION } from '../../lib/privacyNotice'

function Section({ title, children }) {
  return (
    <section className="flex flex-col gap-1.5">
      <h2 className="text-[15px] font-bold text-ink">{title}</h2>
      {children}
    </section>
  )
}

/**
 * Aviso de privacidade e termo de responsabilidade dos operadores (LGPD).
 * `ProtectedRoute` manda pra cá enquanto o token disser
 * `privacyNoticePending` (versão vigente ainda não aceita — ver
 * lib/privacyNotice.js); depois de aceito, a tela continua acessível em
 * Configurações > Meu Perfil só pra leitura. Mudou o texto? Troque a versão
 * (frontend e backend): todo mundo lê de novo.
 */
export default function PrivacyNoticePage() {
  const { user, refreshAccessToken, logout } = useAuth()
  const navigate = useNavigate()
  const [company, setCompany] = useState(null)
  const [acceptedAt, setAcceptedAt] = useState(null)
  const [confirmed, setConfirmed] = useState(false)
  const [error, setError] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const isPending = user.privacyNoticePending

  useEffect(() => {
    api
      .get('/companies/me')
      .then(({ data }) => setCompany(data))
      .catch(() => {})
    if (!isPending) {
      api
        .get(`/users/${user.userId}`)
        .then(({ data }) => setAcceptedAt(data.privacyNoticeAcceptedAt))
        .catch(() => {})
    }
  }, [isPending, user.userId])

  async function handleAccept() {
    setError(null)
    setIsSubmitting(true)
    try {
      await api.post('/users/me/privacy-notice', { version: PRIVACY_NOTICE_VERSION })
      // Token atual ainda diz "pendente" (emitido antes do aceite): pega um novo.
      await refreshAccessToken()
      navigate('/', { replace: true })
    } catch (err) {
      setError(getErrorMessage(err, 'Não foi possível registrar sua ciência agora.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const companyName = company?.trade_name || company?.corporate_name || 'A empresa'
  const contact =
    company?.privacy_contact || company?.contact_email || (company?.contact_phone ? formatPhone(company.contact_phone) : null)

  return (
    <AuthLayout fitScreen>
      <div className="relative flex max-h-full w-full max-w-[640px] flex-col rounded-2xl bg-white shadow-[0px_16px_16px_rgba(28,46,36,0.05)]">
        <div className="flex flex-col gap-2 border-b border-line px-8 pb-5 pt-8">
          <div className="flex size-11 items-center justify-center rounded-lg bg-brand-50">
            <ShieldCheck className="size-5 text-brand" strokeWidth={2} />
          </div>
          <h1 className="mt-1 text-2xl font-bold text-ink">Privacidade e uso responsável</h1>
          <p className="text-sm leading-snug text-muted">
            {isPending
              ? 'Antes de começar, leia como tratamos os seus dados e as regras para lidar com os dados das pessoas que passam pela portaria.'
              : 'Aviso de privacidade e termo de responsabilidade do sistema de portaria.'}
          </p>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-8 py-6 text-sm leading-relaxed text-gray-700">
          <Section title="Os seus dados como usuário">
            <p>
              {companyName} guarda o seu nome, CPF e e-mail para dar acesso ao sistema, e registra seus logins (data,
              hora, endereço IP e navegador) e tudo o que você cadastra ou altera. Isso serve para proteger as contas,
              investigar incidentes e saber quem fez cada registro. Seus documentos ficam guardados com criptografia, e
              sua senha nunca é armazenada de forma legível.
            </p>
            <p>
              Você pode baixar tudo o que o sistema guarda sobre você em{' '}
              <strong>Configurações &gt; Meu Perfil &gt; Exportar meus dados</strong>, e pedir correção ou exclusão ao
              administrador{contact ? ` ou pelo contato ${contact}` : ''}.
            </p>
          </Section>

          <Section title="Os dados das pessoas que você atende">
            <p>
              No trabalho você vai ver nome, CPF, RG, telefone, fotos e placas de visitantes, prestadores e
              funcionários. Esses dados pertencem a essas pessoas e são protegidos pela LGPD (Lei nº 13.709/2018).
              Ao usar o sistema, você se compromete a:
            </p>
            <ul className="ml-5 list-disc">
              <li>usar esses dados só para o controle de acesso e a segurança da empresa;</li>
              <li>não copiar, fotografar, anotar nem repassar esses dados a ninguém fora dessa finalidade;</li>
              <li>consultar um cadastro só quando o atendimento precisar;</li>
              <li>manter sua senha em sigilo e nunca emprestar seu login;</li>
              <li>avisar o administrador sobre qualquer suspeita de vazamento ou de uso indevido.</li>
            </ul>
            <p>
              Cada cadastro, alteração e exportação de dados fica registrado com o seu usuário. O uso indevido pode
              levar a medidas disciplinares e à responsabilização prevista na LGPD.
            </p>
          </Section>

          {!isPending && (
            <p className="rounded-lg bg-brand-50 px-4 py-3 text-[13px] text-ink">
              {acceptedAt
                ? `Você deu ciência deste aviso em ${new Date(acceptedAt).toLocaleString('pt-BR')}.`
                : 'Você já deu ciência deste aviso.'}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-4 border-t border-line px-8 pb-7 pt-5">
          {isPending ? (
            <>
              <label className="flex items-start gap-2.5 text-sm text-ink" htmlFor="privacy-notice-confirm">
                <input
                  id="privacy-notice-confirm"
                  type="checkbox"
                  checked={confirmed}
                  onChange={(event) => setConfirmed(event.target.checked)}
                  className="mt-1"
                />
                <span>Li o aviso e me comprometo a seguir as regras de uso dos dados.</span>
              </label>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <button
                type="button"
                onClick={handleAccept}
                disabled={!confirmed || isSubmitting}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-brand text-[15px] font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {isSubmitting ? 'Registrando...' : 'Continuar'}
                {!isSubmitting && <ArrowRightToLine className="size-4" strokeWidth={2.25} />}
              </button>
              <button
                type="button"
                onClick={logout}
                className="flex w-full items-center justify-center gap-1.5 text-[13px] font-semibold text-muted hover:text-ink"
              >
                <LogOut className="size-3.5" strokeWidth={2.25} />
                Sair
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-lg border border-line text-[15px] font-semibold text-ink hover:bg-gray-50"
            >
              <ArrowLeft className="size-4" strokeWidth={2.25} />
              Voltar
            </button>
          )}
        </div>
      </div>
    </AuthLayout>
  )
}
