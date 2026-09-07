import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test, vi } from 'vitest'
import ToggleSwitch from './ToggleSwitch'

// Regressão do bug real já corrigido nesta tela (ver comentário no próprio
// componente): a bolinha precisa de um `left-0` explícito, senão o
// `text-align: center` padrão do <button> nativo faz o `translate-x` estourar
// o track quando ativado. Este teste trava esse comportamento.
describe('ToggleSwitch', () => {
  function getThumb() {
    return screen.getByRole('switch').querySelector('span')
  }

  test('aria-checked reflete a prop `checked`', () => {
    const { rerender } = render(<ToggleSwitch checked={false} onChange={() => {}} />)
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'false')

    rerender(<ToggleSwitch checked onChange={() => {}} />)
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'true')
  })

  test('a bolinha sempre tem left-0, nos dois estados (regressão do bug de overflow)', () => {
    const { rerender } = render(<ToggleSwitch checked={false} onChange={() => {}} />)
    expect(getThumb()).toHaveClass('left-0')

    rerender(<ToggleSwitch checked onChange={() => {}} />)
    expect(getThumb()).toHaveClass('left-0')
  })

  test('translate-x muda entre marcado e desmarcado', () => {
    const { rerender } = render(<ToggleSwitch checked={false} onChange={() => {}} />)
    expect(getThumb()).toHaveClass('translate-x-0.5')
    expect(getThumb()).not.toHaveClass('translate-x-[18px]')

    rerender(<ToggleSwitch checked onChange={() => {}} />)
    expect(getThumb()).toHaveClass('translate-x-[18px]')
    expect(getThumb()).not.toHaveClass('translate-x-0.5')
  })

  test('clique chama onChange com o valor invertido', async () => {
    const user = userEvent.setup()
    const handleChange = vi.fn()
    render(<ToggleSwitch checked={false} onChange={handleChange} />)

    await user.click(screen.getByRole('switch'))

    expect(handleChange).toHaveBeenCalledTimes(1)
    expect(handleChange).toHaveBeenCalledWith(true)
  })

  test('renderiza o label quando informado', () => {
    render(<ToggleSwitch checked={false} onChange={() => {}} label="Lembrar usuário" />)
    expect(screen.getByText('Lembrar usuário')).toBeInTheDocument()
  })
})
