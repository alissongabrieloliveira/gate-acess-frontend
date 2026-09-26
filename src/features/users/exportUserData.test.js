import { describe, expect, it } from 'vitest'
import { buildUserDataHtml } from './exportUserData'

const data = {
  generatedAt: '2026-09-26T20:00:00.000Z',
  company: { name: 'Mibasa', corporateName: 'Mibasa Ltda', cnpj: '11222333000181' },
  user: {
    id: 5,
    name: 'Operador <i>Teste</i>',
    cpf: '52998224725',
    email: 'op@mibasa.com',
    rules: 0,
    isActive: true,
    createdAt: '2026-09-01T10:00:00.000Z',
    updatedAt: '2026-09-02T10:00:00.000Z',
  },
  loginLogs: [{ loginTime: '2026-09-20T10:00:00.000Z', ipAddress: '10.0.0.1', userAgent: 'Chrome', status: 'FAILED' }],
  sessions: {
    count: 3,
    firstAt: '2026-09-01T10:00:00.000Z',
    lastAt: '2026-09-20T10:00:00.000Z',
    ipAddresses: [{ value: '10.0.0.1', count: 3, lastUsedAt: '2026-09-20T10:00:00.000Z' }],
    userAgents: [{ value: 'Chrome', count: 3, lastUsedAt: '2026-09-20T10:00:00.000Z' }],
  },
  activity: [{ tableName: 'access_logs', action: 'INSERT', count: 14, firstAt: '2026-09-01T10:00:00.000Z', lastAt: '2026-09-20T10:00:00.000Z' }],
  changeHistory: [{ action: 'UPDATE', changedAt: '2026-09-02T10:00:00.000Z', fields: ['rules', 'must_change_password'] }],
}

describe('buildUserDataHtml (exportação LGPD de usuário)', () => {
  const html = buildUserDataHtml(data)

  it('traz cadastro, logins, sessões, atividade e histórico', () => {
    expect(html).toContain('529.982.247-25')
    expect(html).toContain('op@mibasa.com')
    expect(html).toContain('Operador</td>')
    expect(html).toContain('logins (1)')
    expect(html).toContain('Falha')
    expect(html).toContain('Sessões (3)')
    expect(html).toContain('Controle de Acessos')
    expect(html).toContain('>14<')
    expect(html).toContain('Permissões, Troca de senha obrigatória')
  })

  it('avisa que a senha não faz parte e escapa texto', () => {
    expect(html).toContain('A senha nunca é armazenada de forma legível')
    expect(html).toContain('Operador &lt;i&gt;Teste&lt;/i&gt;')
  })
})
