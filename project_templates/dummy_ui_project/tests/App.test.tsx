import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import App from '../src/App'

describe('App', () => {
  it('renders the initial counter', () => {
    render(<App />)

    expect(screen.getByText('Clicked 0 times')).toBeInTheDocument()
  })

  it('increments the counter when the button is clicked', async () => {
    const user = userEvent.setup()

    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Increment' }))

    expect(screen.getByText('Clicked 1 times')).toBeInTheDocument()
  })
})
