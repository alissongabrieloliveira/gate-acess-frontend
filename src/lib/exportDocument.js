import { formatCnpj } from './format'

// Base das exportações de dados do titular (LGPD — pessoas e usuários): mesmo
// padrão do "Exportar PDF" dos relatórios (ver reports/exportReportPdf.js) —
// monta o documento no cliente e abre o diálogo de impressão ("salvar como
// PDF"), sem biblioteca. A janela precisa ser aberta de forma síncrona no
// clique, antes do fetch, senão o navegador bloqueia o pop-up.
export function openExportWindow() {
  return window.open('', '_blank', 'width=1000,height=700')
}

export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function formatDateTime(value) {
  return value ? new Date(value).toLocaleString('pt-BR') : '—'
}

export function table(columns, rows, emptyText) {
  if (rows.length === 0) return `<p class="empty">${escapeHtml(emptyText)}</p>`
  const head = columns.map((col) => `<th>${escapeHtml(col.label)}</th>`).join('')
  const body = rows
    .map((row) => `<tr>${columns.map((col) => `<td>${escapeHtml(col.value(row) ?? '—')}</td>`).join('')}</tr>`)
    .join('')
  return `<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`
}

// Tabela "rótulo: valor" dos dados cadastrais.
export function keyValueTable(pairs) {
  const rows = pairs
    .map(([label, value]) => `<tr><th>${escapeHtml(label)}</th><td>${escapeHtml(value ?? '—')}</td></tr>`)
    .join('')
  return `<table class="kv">${rows}</table>`
}

export const DOCUMENT_STYLES = `
  body { font-family: system-ui, sans-serif; padding: 24px; color: #1c2e24; font-size: 12px; }
  h1 { font-size: 18px; margin: 0 0 2px; }
  h2 { font-size: 14px; margin: 22px 0 8px; }
  p { margin: 0 0 6px; }
  p.subtitle, p.note { color: #52655a; }
  p.empty { color: #8a9a91; font-style: italic; }
  .person { display: flex; gap: 16px; align-items: flex-start; }
  .person img { width: 110px; height: 110px; object-fit: cover; border-radius: 8px; border: 1px solid #d5e0dc; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; }
  th, td { border: 1px solid #d5e0dc; padding: 5px 7px; text-align: left; vertical-align: top; }
  th { background: #eef3f0; font-weight: 600; }
  table.kv th { width: 130px; }
  @media print { @page { margin: 14mm; } h2 { break-after: avoid; } tr { break-inside: avoid; } }
`

// Nomes de campo do histórico de alterações (colunas do banco, já sem o
// sufixo _encrypted — ver data-export.service.js#changedFields).
export const FIELD_LABELS = {
  name: 'Nome',
  cpf: 'CPF',
  rg: 'RG',
  phone: 'Telefone',
  email: 'E-mail',
  photo_url: 'Foto',
  person_type: 'Tipo de pessoa',
  is_blocked: 'Bloqueio',
  block_reason: 'Motivo do bloqueio',
  rules: 'Permissões',
  is_active: 'Situação (ativo/inativo)',
  must_change_password: 'Troca de senha obrigatória',
  email_verified_at: 'Verificação de e-mail',
  deleted_at: 'Exclusão do cadastro',
}

export const HISTORY_ACTION_LABELS = {
  INSERT: 'Cadastro criado',
  UPDATE: 'Cadastro alterado',
  DELETE: 'Cadastro excluído',
  EXPORT: 'Dados exportados',
  ANONYMIZE: 'Dados anonimizados',
}

export const HISTORY_COLUMNS = [
  { label: 'Data', value: (h) => formatDateTime(h.changedAt) },
  { label: 'Evento', value: (h) => HISTORY_ACTION_LABELS[h.action] ?? h.action },
  { label: 'Campos', value: (h) => h.fields.map((f) => FIELD_LABELS[f] ?? f).join(', ') || null },
]

export function documentHeader(title, data) {
  const { company } = data
  return `
    <h1>${escapeHtml(title)}</h1>
    <p class="subtitle">
      ${escapeHtml(company.corporateName)}${company.cnpj ? ` — CNPJ ${escapeHtml(formatCnpj(company.cnpj))}` : ''} ·
      gerado em ${escapeHtml(formatDateTime(data.generatedAt))}
    </p>
    <p class="note">
      Documento emitido em atendimento ao art. 18 da Lei 13.709/2018 (LGPD): reúne todos os dados pessoais
      do titular registrados no sistema de controle de acesso da empresa.
    </p>
  `
}

export function writeExportDocument(printWindow, html) {
  if (!printWindow) return
  printWindow.document.write(html)
  printWindow.document.close()
  printWindow.focus()
  // Espera a foto (URL assinada) carregar antes de abrir o diálogo de impressão.
  const img = printWindow.document.querySelector('img')
  if (img && !img.complete) {
    img.addEventListener('load', () => printWindow.print(), { once: true })
    img.addEventListener('error', () => printWindow.print(), { once: true })
  } else {
    printWindow.print()
  }
}
