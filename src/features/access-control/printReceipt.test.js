import { describe, expect, it } from 'vitest'
import { privacyNotice } from './printReceipt'

describe('privacyNotice (aviso LGPD no recibo)', () => {
  it('usa o contato de privacidade quando existe', () => {
    const text = privacyNotice({ trade_name: 'Mibasa', privacy_contact: 'privacidade@mibasa.com', contact_email: 'geral@mibasa.com' })
    expect(text).toContain('tratados por Mibasa')
    expect(text).toContain('pelo contato privacidade@mibasa.com')
  })

  it('cai para o e-mail e depois para o telefone de contato', () => {
    expect(privacyNotice({ corporate_name: 'Mibasa Ltda', contact_email: 'geral@mibasa.com' })).toContain('geral@mibasa.com')
    expect(privacyNotice({ corporate_name: 'Mibasa Ltda', contact_phone: '6233330000' })).toContain('(62) 3333-0000')
  })

  it('sem contato nem empresa, orienta a procurar a portaria', () => {
    expect(privacyNotice(null)).toBe(
      'Seus dados pessoais são tratados pela empresa para controle de acesso e segurança, conforme a LGPD. ' +
        'Para acessar, corrigir ou pedir a exclusão dos seus dados, fale conosco na portaria.'
    )
  })
})
