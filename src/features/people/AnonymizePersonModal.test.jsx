import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import AnonymizePersonModal from './AnonymizePersonModal'

vi.mock('../../lib/api', () => ({ api: { post: vi.fn(() => Promise.resolve({ data: {} })) } }))
import { api } from '../../lib/api'

describe('AnonymizePersonModal', () => {
  it('só anonimiza depois de marcar a confirmação', async () => {
    const onAnonymized = vi.fn()
    render(<AnonymizePersonModal person={{ id: 7, name: 'Joana' }} onClose={() => {}} onAnonymized={onAnonymized} />)

    const button = screen.getByRole('button', { name: 'Anonimizar' })
    expect(button).toBeDisabled()

    await userEvent.click(screen.getByRole('checkbox'))
    expect(button).toBeEnabled()
    await userEvent.click(button)

    expect(api.post).toHaveBeenCalledWith('/people/7/anonymize')
    expect(onAnonymized).toHaveBeenCalled()
  })
})
