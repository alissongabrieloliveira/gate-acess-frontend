import { describe, expect, it, vi } from 'vitest'
import { getCompanyLogoDataUrl } from '../../lib/company'
import { writeReportPdf } from './exportReportPdf'

vi.mock('../../lib/company', () => ({
  getCompanyLogoDataUrl: vi.fn(async () => null),
  printWhenReady: (win) => win.print(),
}))

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
  it('coluna com total gera a linha de total no rodapé da tabela', async () => {
    const win = fakeWindow()
    await writeReportPdf({
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

  it('sem coluna de total (ou sem registros) não gera rodapé', async () => {
    const win = fakeWindow()
    await writeReportPdf({ printWindow: win, title: 'R', subtitle: '', columns: [{ label: 'Nome', value: (r) => r.name }], rows })
    expect(win.html()).not.toContain('<tfoot>')

    const empty = fakeWindow()
    await writeReportPdf({
      printWindow: empty,
      title: 'R',
      subtitle: '',
      columns: [{ label: 'KM', value: (r) => r.km, total: () => '0 km' }],
      rows: [],
    })
    expect(empty.html()).not.toContain('<tfoot>')
  })

  it('com logo da empresa, ela entra no cabeçalho; sem logo, nenhuma imagem', async () => {
    getCompanyLogoDataUrl.mockResolvedValueOnce('data:image/png;base64,AAAA')
    const win = fakeWindow()
    await writeReportPdf({ printWindow: win, title: 'R', subtitle: '', columns: [{ label: 'Nome', value: (r) => r.name }], rows })
    expect(win.html()).toContain('<img src="data:image/png;base64,AAAA"')

    const noLogo = fakeWindow()
    await writeReportPdf({ printWindow: noLogo, title: 'R', subtitle: '', columns: [{ label: 'Nome', value: (r) => r.name }], rows })
    expect(noLogo.html()).not.toContain('<img')
  })
})
