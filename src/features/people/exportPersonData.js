import {
  documentHeader,
  DOCUMENT_STYLES,
  escapeHtml,
  formatDateTime,
  HISTORY_COLUMNS,
  keyValueTable,
  openExportWindow,
  table,
  writeExportDocument,
} from '../../lib/exportDocument'
import { formatCpf, formatPhone, formatPlateInput, formatRg } from '../../lib/format'
import { PERSON_TYPE_LABELS } from './usePeopleData'

// Exportação de dados do titular (LGPD art. 18/19) — ver lib/exportDocument.js.
export { openExportWindow }

const STATUS_LABELS = { ACTIVE: 'Em andamento', FINISHED: 'Finalizado', ON_TRIP: 'Em viagem', RETURNED: 'Retornado' }

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

export function buildPersonDataHtml(data) {
  const { person } = data
  const personTable = keyValueTable([
    ['Nome', person.name],
    ['CPF', person.cpf ? formatCpf(person.cpf) : null],
    ['RG', person.rg ? formatRg(person.rg) : null],
    ['Telefone', person.phone ? formatPhone(person.phone) : null],
    ['Tipo', PERSON_TYPE_LABELS[person.personType]],
    ['Situação', person.isBlocked ? `Bloqueado — ${person.blockReason ?? 'sem motivo informado'}` : 'Ativo'],
    ['Cadastrado em', formatDateTime(person.createdAt)],
    ['Última alteração', formatDateTime(person.updatedAt)],
  ])

  return `
    <!doctype html>
    <html lang="pt-BR">
      <head>
        <meta charset="utf-8" />
        <title>Dados pessoais — ${escapeHtml(person.name)}</title>
        <style>${DOCUMENT_STYLES}</style>
      </head>
      <body>
        ${documentHeader('Relatório de dados pessoais do titular', data)}

        <h2>1. Dados cadastrais</h2>
        <div class="person">
          ${person.photoUrl ? `<img src="${escapeHtml(person.photoUrl)}" alt="Foto cadastrada" />` : ''}
          ${personTable}
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
  writeExportDocument(printWindow, buildPersonDataHtml(data))
}
