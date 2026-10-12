import { describe, expect, it, vi } from 'vitest'
import { writeReportPdf } from './exportReportPdf'

function fakeWindow() {
  let html = ''
  return {
    document: { write: (chunk) => (html += chunk), close: vi.fn() },
    focus: vi.fn(),
    print: vi.fn(),
    html: () => html,
  }
}

const rows = [{ name: 'A', km: 10 }, { name: 'B', km: 5 }]

describe('writeReportPdf', () => {
  it('coluna com total gera a linha de total no rodapé da tabela', () => {
    const win = fakeWindow()
    writeReportPdf({
      printWindow: win,
      title: 'Relatório',
      subtitle: 'Todos',
      columns: [
        { label: 'Nome', value: (r) => r.name },
        { label: 'KM', value: (r) => r.km, total: (all) => `${all.reduce((s, r) => s + r.km, 0)} km` },
      ],
      rows,
    })
    expect(win.html()).toContain('<tfoot><tr><td>Total</td><td>15 km</td></tr></tfoot>')
    expect(win.print).toHaveBeenCalled()
  })

  it('sem coluna de total (ou sem registros) não gera rodapé', () => {
    const win = fakeWindow()
    writeReportPdf({ printWindow: win, title: 'R', subtitle: '', columns: [{ label: 'Nome', value: (r) => r.name }], rows })
    expect(win.html()).not.toContain('<tfoot>')

    const empty = fakeWindow()
    writeReportPdf({
      printWindow: empty,
      title: 'R',
      subtitle: '',
      columns: [{ label: 'KM', value: (r) => r.km, total: () => '0 km' }],
      rows: [],
    })
    expect(empty.html()).not.toContain('<tfoot>')
  })
})
