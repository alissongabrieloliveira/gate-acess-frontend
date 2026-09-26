import {
  documentHeader,
  DOCUMENT_STYLES,
  escapeHtml,
  formatDateTime,
  HISTORY_COLUMNS,
  keyValueTable,
  table,
  writeExportDocument,
} from '../../lib/exportDocument'
import { formatCpf } from '../../lib/format'
import { RULES } from '../../lib/rules'
import { ACTION_LABELS, TABLE_LABELS } from '../reports/useAuditLogsData'

// Exportação de dados do operador (LGPD art. 18/19) — ver lib/exportDocument.js
// e backend data-export.service.js#exportUserData.

const LOGIN_STATUS_LABELS = { SUCCESS: 'Sucesso', FAILED: 'Falha' }
const EXTRA_TABLE_LABELS = { gate_direction_outputs: 'Cancelas', gate_controller_outputs: 'Cancelas' }

const LOGIN_COLUMNS = [
  { label: 'Data', value: (l) => formatDateTime(l.loginTime) },
  { label: 'Resultado', value: (l) => LOGIN_STATUS_LABELS[l.status] ?? l.status },
  { label: 'IP', value: (l) => l.ipAddress },
  { label: 'Navegador / dispositivo', value: (l) => l.userAgent },
]

const USAGE_COLUMNS = (label) => [
  { label, value: (u) => u.value },
  { label: 'Sessões', value: (u) => String(u.count) },
  { label: 'Último uso', value: (u) => formatDateTime(u.lastUsedAt) },
]

const ACTIVITY_COLUMNS = [
  { label: 'Tela', value: (a) => TABLE_LABELS[a.tableName] ?? EXTRA_TABLE_LABELS[a.tableName] ?? a.tableName },
  { label: 'Ação', value: (a) => ACTION_LABELS[a.action] ?? a.action },
  { label: 'Quantidade', value: (a) => String(a.count) },
  { label: 'Primeira', value: (a) => formatDateTime(a.firstAt) },
  { label: 'Última', value: (a) => formatDateTime(a.lastAt) },
]

export function buildUserDataHtml(data) {
  const { user, sessions } = data
  const userTable = keyValueTable([
    ['Nome', user.name],
    ['CPF', user.cpf ? formatCpf(user.cpf) : null],
    ['E-mail', user.email],
    ['Perfil', user.rules & RULES.ADMIN ? 'Administrador' : 'Operador'],
    ['Situação', user.isActive ? 'Ativo' : 'Inativo'],
    [
      'Aviso de privacidade',
      user.privacyNoticeAcceptedAt
        ? `Ciente em ${formatDateTime(user.privacyNoticeAcceptedAt)} (versão ${user.privacyNoticeVersion})`
        : 'Ainda não deu ciência',
    ],
    ['Cadastrado em', formatDateTime(user.createdAt)],
    ['Última alteração', formatDateTime(user.updatedAt)],
  ])

  return `
    <!doctype html>
    <html lang="pt-BR">
      <head>
        <meta charset="utf-8" />
        <title>Dados pessoais — ${escapeHtml(user.name)}</title>
        <style>${DOCUMENT_STYLES}</style>
      </head>
      <body>
        ${documentHeader('Relatório de dados pessoais do usuário do sistema', data)}
        <p class="note">A senha nunca é armazenada de forma legível e não faz parte deste relatório.</p>

        <h2>1. Dados cadastrais</h2>
        ${userTable}

        <h2>2. Acessos ao sistema — logins (${data.loginLogs.length})</h2>
        ${table(LOGIN_COLUMNS, data.loginLogs, 'Nenhum login registrado.')}

        <h2>3. Sessões (${sessions.count})</h2>
        <p class="note">
          Cada renovação automática do acesso gera uma sessão; por isso elas aparecem agrupadas por IP e por
          navegador.${sessions.count ? ` Primeira em ${escapeHtml(formatDateTime(sessions.firstAt))}, última em ${escapeHtml(formatDateTime(sessions.lastAt))}.` : ''}
        </p>
        ${table(USAGE_COLUMNS('IP'), sessions.ipAddresses, 'Nenhuma sessão registrada.')}
        ${sessions.userAgents.length ? `<p></p>${table(USAGE_COLUMNS('Navegador / dispositivo'), sessions.userAgents, '')}` : ''}

        <h2>4. Atividade no sistema</h2>
        <p class="note">
          Resumo do que foi registrado ou alterado por este usuário, por tela e tipo de ação. O conteúdo dos
          registros não é listado aqui porque envolve dados de outras pessoas.
        </p>
        ${table(ACTIVITY_COLUMNS, data.activity, 'Nenhuma atividade registrada.')}

        <h2>5. Histórico do cadastro</h2>
        <p class="note">Quando o cadastro foi criado, alterado ou exportado, e quais campos mudaram.</p>
        ${table(HISTORY_COLUMNS, data.changeHistory, 'Sem histórico registrado.')}
      </body>
    </html>
  `
}

export function writeUserDataExport(printWindow, data) {
  writeExportDocument(printWindow, buildUserDataHtml(data))
}
