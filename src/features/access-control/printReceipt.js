import { api } from '../../lib/api'
import { formatCpf, formatPlateInput } from '../../lib/format'

function formatDateTime(value) {
  if (!value) return '----'
  return new Date(value).toLocaleString('pt-BR')
}

function formatDate(value) {
  return new Date(value).toLocaleDateString('pt-BR')
}

// Dados da empresa mudam raramente durante uma sessão — evita um GET
// /companies/me a cada recibo impresso (o operador pode imprimir vários
// seguidos). Só uma vez por carregamento de página.
let cachedCompany = null
async function getCompany() {
  if (cachedCompany) return cachedCompany
  try {
    const { data } = await api.get('/companies/me')
    cachedCompany = data
    return data
  } catch {
    // Sem empresa carregada, o recibo cai pro nome genérico (ver template
    // abaixo) em vez de travar a impressão por causa disso.
    return null
  }
}

// Célula de uma "linha" do formulário — `value` vazio ou ausente vira uma
// linha só com o rótulo, com espaço em branco pra preencher à mão (ex.:
// Firma/Assunto, que o sistema ainda não cadastra, e os campos que são
// sempre preenchidos na hora, como assinaturas).
function cell(label, value, { tall } = {}) {
  return `
    <div class="cell${tall ? ' cell--tall' : ''}">
      <span class="field-label">${label}:</span>
      ${value ? `<span class="field-value">${value}</span>` : ''}
    </div>
  `
}

// Sem endpoint de recibo/PDF no backend — monta um recibo simples no cliente e
// abre o diálogo de impressão nativo do navegador. Layout inspirado no
// canhoto de portaria físico tradicional (formulário com bordas, seção "USO
// EXCLUSIVO DA PORTARIA", linhas de assinatura) em vez de um cartão "moderno".
//
// `existingWindow` permite passar uma janela já aberta de forma síncrona
// (ver openPrintWindow) — chamar window.open() depois de qualquer `await` faz
// o navegador não reconhecer mais a ação como resultado direto de um clique
// do usuário, e o pop-up é bloqueado silenciosamente. Como a janela já foi
// reservada antes, o `await` da empresa aqui dentro não tem esse problema.
export async function printReceipt(log, existingWindow) {
  const printWindow = existingWindow ?? window.open('', '_blank', 'width=800,height=700')
  if (!printWindow) return

  const company = await getCompany()
  const companyName = company?.trade_name || company?.corporate_name || 'Empresa'

  printWindow.document.write(`
    <!doctype html>
    <html lang="pt-BR">
      <head>
        <meta charset="utf-8" />
        <title>Recibo de acesso — ${log.personName}</title>
        <style>
          /* Folha A4 inteira, mas o conteúdo fica confinado à metade
             superior (148,5mm de altura) — dá pra imprimir em impressora
             comum (não térmica) sem gastar a folha toda com um recibo
             curto; a metade de baixo sai em branco de propósito. */
          @page { size: A4; margin: 0; }
          * { box-sizing: border-box; }
          html, body { margin: 0; padding: 0; }
          body { font-family: system-ui, sans-serif; color: #1c1c1c; }
          .receipt {
            width: 210mm;
            height: 148.5mm;
            padding: 14mm 18mm;
            page-break-after: avoid;
          }
          .form {
            border-top: 1px solid #1c1c1c;
            border-left: 1px solid #1c1c1c;
          }
          .row { display: flex; }
          .cell {
            flex: 1;
            border-right: 1px solid #1c1c1c;
            border-bottom: 1px solid #1c1c1c;
            padding: 2mm 3mm;
            font-size: 12px;
            min-width: 0;
          }
          .cell--tall { min-height: 13mm; }
          .field-label { font-weight: 600; }
          .field-value { margin-left: 4px; }
          .welcome-row .cell { padding: 3mm 3mm 2.5mm; }
          .welcome-label { font-size: 13px; }
          .company-name { font-size: 20px; font-weight: 700; margin-left: 6px; }
          .section-row .cell {
            text-align: center;
            font-weight: 700;
            font-size: 11px;
            letter-spacing: 0.04em;
            background: #f0f0f0;
          }
          .footer {
            /* Sem isso, a largura seguia o texto em vez da linha inteira —
               a borda direita parava mais cedo que as células acima,
               deixando o canto inferior direito do formulário torto. */
            flex: 1;
            border-right: 1px solid #1c1c1c;
            border-bottom: 1px solid #1c1c1c;
            padding: 2.5mm 3mm;
            font-size: 10px;
            color: #444;
            text-align: center;
            line-height: 1.4;
          }
        </style>
      </head>
      <body>
        <div class="receipt">
          <div class="form">
            <div class="row welcome-row">
              <div class="cell">
                <span class="welcome-label">Bem vindo à</span><span class="company-name">${companyName}</span>
              </div>
            </div>
            <div class="row">
              ${cell('Visitado', log.visitedPersonName)}
              ${cell('Destino', log.sectorName)}
            </div>
            <div class="row">
              ${cell('Visitante', log.personName)}
              ${cell('CPF', log.personCpf ? formatCpf(log.personCpf) : null)}
            </div>
            <div class="row">
              ${cell('Firma')}
              ${cell('Assunto')}
            </div>
            <div class="row">
              ${cell('Placa do Veículo', log.vehiclePlate ? formatPlateInput(log.vehiclePlate) : null)}
              ${cell('Portão de Entrada', log.entryGateName)}
            </div>
            <div class="row">
              ${cell('Início', null, { tall: true })}
              ${cell('Término', null, { tall: true })}
              ${cell('Visto visitado', null, { tall: true })}
            </div>
            <div class="row section-row">
              <div class="cell">USO EXCLUSIVO DA PORTARIA</div>
            </div>
            <div class="row">
              ${cell('Entrada', formatDateTime(log.entryTime), { tall: true })}
              ${cell('Saída', log.exitTime ? formatDateTime(log.exitTime) : null, { tall: true })}
              ${cell('Visto', null, { tall: true })}
            </div>
            <div class="row">
              ${cell('Responsável Portaria')}
              ${cell('Data', formatDate(new Date()))}
            </div>
            <div class="row">
              <div class="footer">
                A empresa não se responsabiliza por acidentes ocorridos durante a visita.
                Solicite o visto da pessoa responsável por sua liberação.
              </div>
            </div>
          </div>
        </div>
      </body>
    </html>
  `)
  printWindow.document.close()
  printWindow.focus()
  printWindow.print()
}

// Reserva a janela de impressão de forma síncrona, no mesmo tick do clique
// que disparou a submissão — antes de qualquer `await` no handler. Retorna
// `null` se o navegador bloquear mesmo assim (ex.: bloqueador mais agressivo).
export function openPrintWindow() {
  return window.open('', '_blank', 'width=800,height=700')
}
