import { describe, expect, it } from 'vitest'
import { scrubBreadcrumb, scrubEvent, stripQuery } from './sentry'

describe('sentry — dados pessoais fora dos eventos', () => {
  it('remove a query string da URL', () => {
    expect(stripQuery('https://api.x/api/v1/people?search=52998224725')).toBe('https://api.x/api/v1/people?[redacted]')
    expect(stripQuery('/dashboard')).toBe('/dashboard')
  })

  it('limpa a URL da página (token de redefinição de senha)', () => {
    const event = scrubEvent({ request: { url: 'https://app.x/reset-password?token=abc', query_string: 'token=abc' } })
    expect(event.request).toEqual({ url: 'https://app.x/reset-password?[redacted]' })
  })

  it('limpa URLs de requisições e navegação nos breadcrumbs', () => {
    const xhr = scrubBreadcrumb({ category: 'xhr', data: { url: '/api/v1/people?search=Maria', method: 'GET' } })
    expect(xhr.data).toEqual({ url: '/api/v1/people?[redacted]', method: 'GET' })
    const nav = scrubBreadcrumb({ category: 'navigation', data: { from: '/a?x=1', to: '/reset-password?token=abc' } })
    expect(nav.data).toEqual({ from: '/a?[redacted]', to: '/reset-password?[redacted]' })
  })
})
