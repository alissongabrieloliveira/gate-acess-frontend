import { formatCnpj, formatCpf, formatPhone, formatPlateInput, formatRg } from '../../lib/format'
import { PERSON_TYPE_LABELS } from './usePeopleData'

// Exportação de dados do titular (LGPD art. 18/19): mesmo padrão do "Exportar
// PDF" dos relatórios (ver reports/exportReportPdf.js) — monta o documento no
// cliente e abre o diálogo de impressão ("salvar como PDF"), sem biblioteca.
// A janela precisa ser aberta de forma síncrona no clique, antes do fetch.
export function openExportWindow() {
  return window.open('', '_blank', 'width=1000,height=700')
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function formatDateTime(value) {
  return value ? new Date(value).toLocaleString('pt-BR') : '—'
}

const FIELD_LABELS = {
  name: 'Nome',
  cpf: 'CPF',
  rg: 'RG',
  phone: 'Telefone',
  photo_url: 'Foto',
  person_type: 'Tipo de pessoa',
  is_blocked: 'Bloqueio',
  block_reason: 'Motivo do bloqueio',
  deleted_at: 'Exclusão do cadastro',
}

const ACTION_LABELS = {
  INSERT: 'Cadastro criado',
  UPDATE: 'Cadastro alterado',
  DELETE: 'Cadastro excluído',
  EXPORT: 'Dados exportados',
}

const STATUS_LABELS = { ACTIVE: 'Em andamento', FINISHED: 'Finalizado', ON_TRIP: 'Em viagem', RETURNED: 'Retornado' }

function table(columns, rows, emptyText) {
  if (rows.length === 0) return `<p class="empty">${escapeHtml(emptyText)}</p>`
  const head = columns.map((col) => `<th>${escapeHtml(col.label)}</th>`).join('')
  const body = rows
    .map((row) => `<tr>${columns.map((col) => `<td>${escapeHtml(col.value(row) ?? '—')}</td>`).join('')}</tr>`)
    .join('')
  return `<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`
}

function plate(vehicle) {
  return vehicle?.licensePlate ? formatPlateInput(vehicle.licensePlate) : null
}

const ACCESS_COMMON = [
  { label: 'Entrada', value: (l) => formatDateTime(l.entryTime) },
  { label: 'Saída', value: (l) => (l.exitTime ? formatDateTime(l.exitTime) : null) },
  { label: 'Posto', value: (l) => l.entryGate?.name },
  { label: 'Setor', value: (l) => l.destinationSector?.name },
  { label: 'Veículo', value: (l) => plate(l.vehicle) },
  { label: 'Motivo', value: (l) => l.visitReason },
  { label: 'Observações', value: (l) => l.observation },
  { label: 'Foto do veículo', value: (l) => (l.hasVehiclePhoto ? 'Sim' : 'Não') },
]

const AS_VISITOR_COLUMNS = [{ label: 'Anfitrião', value: (l) => l.visitedPerson?.name }, ...ACCESS_COMMON]
const AS_HOST_COLUMNS = [
  { label: 'Visitante', value: (l) => l.person?.name },
  ...ACCESS_COMMON.filter((c) => !['Motivo', 'Observações', 'Foto do veículo', 'Veículo'].includes(c.label)),
]

const FLEET_COLUMNS = [
  { label: 'Saída', value: (l) => formatDateTime(l.departureTime) },
  { label: 'Retorno', value: (l) => (l.returnTime ? formatDateTime(l.returnTime) : null) },
  { label: 'Veículo', value: (l) => plate(l.vehicle) },
  { label: 'Destino', value: (l) => l.destination },
  { label: 'Motivo', value: (l) => l.purpose },
  { label: 'Observações', value: (l) => l.observation },
  { label: 'Situação', value: (l) => STATUS_LABELS[l.status] ?? l.status },
]

const HISTORY_COLUMNS = [
  { label: 'Data', value: (h) => formatDateTime(h.changedAt) },
  { label: 'Evento', value: (h) => ACTION_LABELS[h.action] ?? h.action },
  { label: 'Campos', value: (h) => h.fields.map((f) => FIELD_LABELS[f] ?? f).join(', ') || null },
]

export function buildPersonDataHtml(data) {
  const { person, company } = data
  const personRows = [
    ['Nome', person.name],
    ['CPF', person.cpf ? formatCpf(person.cpf) : null],
    ['RG', person.rg ? formatRg(person.rg) : null],
    ['Telefone', person.phone ? formatPhone(person.phone) : null],
    ['Tipo', PERSON_TYPE_LABELS[person.personType]],
    ['Situação', person.isBlocked ? `Bloqueado — ${person.blockReason ?? 'sem motivo informado'}` : 'Ativo'],
    ['Cadastrado em', formatDateTime(person.createdAt)],
    ['Última alteração', formatDateTime(person.updatedAt)],
  ]
    .map(([label, value]) => `<tr><th>${escapeHtml(label)}</th><td>${escapeHtml(value ?? '—')}</td></tr>`)
    .join('')

  return `
    <!doctype html>
    <html lang="pt-BR">
      <head>
        <meta charset="utf-8" />
        <title>Dados pessoais — ${escapeHtml(person.name)}</title>
        <style>
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
          .person table th { width: 130px; }
          @media print { @page { margin: 14mm; } h2 { break-after: avoid; } tr { break-inside: avoid; } }
        </style>
      </head>
      <body>
        <h1>Relatório de dados pessoais do titular</h1>
        <p class="subtitle">
          ${escapeHtml(company.corporateName)}${company.cnpj ? ` — CNPJ ${escapeHtml(formatCnpj(company.cnpj))}` : ''} ·
          gerado em ${escapeHtml(formatDateTime(data.generatedAt))}
        </p>
        <p class="note">
          Documento emitido em atendimento ao art. 18 da Lei 13.709/2018 (LGPD): reúne todos os dados pessoais
          do titular registrados no sistema de controle de acesso da empresa.
        </p>

        <h2>1. Dados cadastrais</h2>
        <div class="person">
          ${person.photoUrl ? `<img src="${escapeHtml(person.photoUrl)}" alt="Foto cadastrada" />` : ''}
          <table>${personRows}</table>
        </div>

        <h2>2. Acessos como visitante (${data.accessLogsAsVisitor.length})</h2>
        ${table(AS_VISITOR_COLUMNS, data.accessLogsAsVisitor, 'Nenhum acesso registrado.')}

        <h2>3. Visitas recebidas como anfitrião (${data.accessLogsAsHost.length})</h2>
        ${table(AS_HOST_COLUMNS, data.accessLogsAsHost, 'Nenhuma visita recebida.')}

        <h2>4. Saídas da frota como motorista (${data.fleetLogsAsDriver.length})</h2>
        ${table(FLEET_COLUMNS, data.fleetLogsAsDriver, 'Nenhuma saída como motorista.')}

        <h2>5. Histórico do cadastro</h2>
        <p class="note">Quando o cadastro foi criado, alterado ou exportado, e quais campos mudaram.</p>
        ${table(HISTORY_COLUMNS, data.changeHistory, 'Sem histórico registrado.')}
      </body>
    </html>
  `
}

export function writePersonDataExport(printWindow, data) {
  if (!printWindow) return
  printWindow.document.write(buildPersonDataHtml(data))
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
