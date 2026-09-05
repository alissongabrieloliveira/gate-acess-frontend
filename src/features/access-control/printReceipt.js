function formatDateTime(value) {
  if (!value) return '----'
  return new Date(value).toLocaleString('pt-BR')
}

// Sem endpoint de recibo/PDF no backend — monta um recibo simples no cliente e
// abre o diálogo de impressão nativo do navegador.
//
// `existingWindow` permite passar uma janela já aberta de forma síncrona
// (ver openPrintWindow) — chamar window.open() depois de qualquer `await` faz
// o navegador não reconhecer mais a ação como resultado direto de um clique
// do usuário, e o pop-up é bloqueado silenciosamente.
export function printReceipt(log, existingWindow) {
  const printWindow = existingWindow ?? window.open('', '_blank', 'width=420,height=600')
  if (!printWindow) return

  printWindow.document.write(`
    <!doctype html>
    <html lang="pt-BR">
      <head>
        <meta charset="utf-8" />
        <title>Recibo de acesso — ${log.personName}</title>
        <style>
          body { font-family: system-ui, sans-serif; padding: 24px; color: #1c2e24; }
          h1 { font-size: 16px; margin-bottom: 4px; }
          p { font-size: 13px; margin: 4px 0; }
          .label { color: #52655a; }
          hr { border: none; border-top: 1px solid #d5e0dc; margin: 12px 0; }
        </style>
      </head>
      <body>
        <h1>Comprovante de Acesso</h1>
        <p class="label">Portaria</p>
        <hr />
        <p><span class="label">Visitante:</span> ${log.personName}</p>
        ${log.personCpf ? `<p><span class="label">CPF:</span> ${log.personCpf}</p>` : ''}
        ${log.vehiclePlate ? `<p><span class="label">Placa:</span> ${log.vehiclePlate}</p>` : ''}
        ${log.visitedPersonName ? `<p><span class="label">Anfitrião:</span> ${log.visitedPersonName}</p>` : ''}
        ${log.sectorName ? `<p><span class="label">Destino:</span> ${log.sectorName}</p>` : ''}
        <p><span class="label">Entrada:</span> ${formatDateTime(log.entryTime)} — ${log.entryGateName}</p>
        <p><span class="label">Saída:</span> ${log.exitTime ? `${formatDateTime(log.exitTime)} — ${log.exitGateName}` : '----'}</p>
        ${log.receiptCode ? `<p><span class="label">Código do recibo:</span> ${log.receiptCode}</p>` : ''}
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
  return window.open('', '_blank', 'width=420,height=600')
}
