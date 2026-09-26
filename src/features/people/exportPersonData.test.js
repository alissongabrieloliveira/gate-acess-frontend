import { describe, expect, it } from 'vitest'
import { buildPersonDataHtml } from './exportPersonData'

const data = {
  generatedAt: '2026-09-26T20:00:00.000Z',
  company: { name: 'Mibasa', corporateName: 'Mibasa Ltda', cnpj: '11222333000181' },
  person: {
    id: 1,
    name: 'Maria <b>Teste</b>',
    cpf: '52998224725',
    rg: null,
    phone: '62999990000',
    personType: 3,
    isBlocked: true,
    blockReason: 'Motivo <script>x</script>',
    photoUrl: null,
    createdAt: '2026-09-01T10:00:00.000Z',
    updatedAt: '2026-09-02T10:00:00.000Z',
  },
  accessLogsAsVisitor: [
    { id: 9, entryTime: '2026-09-05T13:00:00.000Z', exitTime: null, entryGate: { name: 'Portaria 1' }, visitReason: 'Reunião', hasVehiclePhoto: true },
  ],
  accessLogsAsHost: [],
  fleetLogsAsDriver: [{ id: 3, departureTime: '2026-09-06T13:00:00.000Z', vehicle: { licensePlate: 'ABC1D23' }, purpose: 'Banco', status: 'RETURNED' }],
  changeHistory: [{ action: 'UPDATE', changedAt: '2026-09-02T10:00:00.000Z', fields: ['phone', 'block_reason'] }],
}

describe('buildPersonDataHtml (exportação LGPD)', () => {
  const html = buildPersonDataHtml(data)

  it('traz todas as seções com as contagens', () => {
    expect(html).toContain('Acessos como visitante (1)')
    expect(html).toContain('Visitas recebidas como anfitrião (0)')
    expect(html).toContain('Saídas da frota como motorista (1)')
    expect(html).toContain('Nenhuma visita recebida.')
  })

  it('formata CPF, CNPJ, telefone, placa e rótulos', () => {
    expect(html).toContain('529.982.247-25')
    expect(html).toContain('11.222.333/0001-81')
    expect(html).toContain('(62) 99999-0000')
    expect(html).toContain('ABC-1D23')
    expect(html).toContain('Funcionário')
    expect(html).toContain('Retornado')
    expect(html).toContain('Telefone, Motivo do bloqueio')
  })

  it('escapa texto livre (nada de HTML injetado)', () => {
    expect(html).not.toContain('<script>x</script>')
    expect(html).toContain('&lt;script&gt;')
    expect(html).toContain('Maria &lt;b&gt;Teste&lt;/b&gt;')
  })
})
