function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

// Sem endpoint de PDF no backend — monta uma tabela HTML no cliente e abre
// o diálogo de impressão nativo do navegador (mesmo padrão já usado no
// recibo de acesso, ver access-control/printReceipt.js). "Exportar PDF" na
// prática é "imprimir e salvar como PDF" — sem depender de nenhuma
// biblioteca nova.
//
// `openReportPrintWindow` precisa ser chamada de forma síncrona, no mesmo
// tick do clique que disparou a exportação — antes de qualquer `await`
// (buscar todas as páginas do relatório é assíncrono). Chamar window.open()
// depois de um `await` faz o navegador não reconhecer mais a ação como
// resultado direto de um clique do usuário, e o pop-up é bloqueado
// silenciosamente.
export function openReportPrintWindow() {
  return window.open('', '_blank', 'width=1000,height=700')
}

export function writeReportPdf({ printWindow, title, subtitle, columns, rows }) {
  if (!printWindow) return

  const head = columns.map((col) => `<th>${escapeHtml(col.label)}</th>`).join('')
  const body = rows
    .map((row) => `<tr>${columns.map((col) => `<td>${escapeHtml(col.value(row))}</td>`).join('')}</tr>`)
    .join('')

  printWindow.document.write(`
    <!doctype html>
    <html lang="pt-BR">
      <head>
        <meta charset="utf-8" />
        <title>${escapeHtml(title)}</title>
        <style>
          body { font-family: system-ui, sans-serif; padding: 24px; color: #1c2e24; }
          h1 { font-size: 18px; margin: 0 0 2px; }
          p.subtitle { font-size: 12px; color: #52655a; margin: 0 0 16px; }
          table { width: 100%; border-collapse: collapse; font-size: 11px; }
          th, td { border: 1px solid #d5e0dc; padding: 6px 8px; text-align: left; white-space: nowrap; }
          th { background: #eef3f0; font-weight: 600; }
          p.footer { margin-top: 16px; font-size: 10px; color: #8a9a91; }
          @media print {
            @page { size: landscape; margin: 14mm; }
          }
        </style>
      </head>
      <body>
        <h1>${escapeHtml(title)}</h1>
        <p class="subtitle">${escapeHtml(subtitle)}</p>
        <table>
          <thead><tr>${head}</tr></thead>
          <tbody>${body || `<tr><td colspan="${columns.length}">Nenhum registro encontrado.</td></tr>`}</tbody>
        </table>
        <p class="footer">Gerado em ${escapeHtml(new Date().toLocaleString('pt-BR'))} — ${rows.length} registro(s)</p>
      </body>
    </html>
  `)
  printWindow.document.close()
  printWindow.focus()
  printWindow.print()
}
