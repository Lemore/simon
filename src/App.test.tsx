import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import App from './App.tsx'

describe('App shell', () => {
  it('shows the home screen by default', () => {
    render(<App />)

    expect(screen.getByRole('heading', { name: 'סיימון' })).toBeInTheDocument()
    expect(screen.getByText('שלב 1 מתוך 10')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'התחל' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'בית' })).toHaveAttribute('aria-current', 'page')
  })

  it('renders the four pads in board order: green, red, yellow, blue', () => {
    render(<App />)

    const board = screen.getByRole('group', { name: 'לוח המשחק' })
    const pads = within(board).getAllByRole('button')
    expect(pads.map((pad) => pad.getAttribute('aria-label'))).toEqual([
      'ירוק',
      'אדום',
      'צהוב',
      'כחול',
    ])
    expect(board).toHaveAttribute('dir', 'ltr')
  })

  it('navigates between home and about without leaving the page', async () => {
    const user = userEvent.setup()
    const startHref = window.location.href
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'אודות' }))

    expect(screen.getByRole('heading', { name: 'אודות' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'על המשחק' })).toBeInTheDocument()
    expect(screen.getByText('לחץ על הצבעים באותו סדר.')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '10 המשחקים האחרונים' })).toBeInTheDocument()
    expect(screen.getByText('עדיין אין משחקים שמורים')).toBeInTheDocument()
    expect(screen.queryByRole('group', { name: 'לוח המשחק' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'אודות' })).toHaveAttribute('aria-current', 'page')

    await user.click(screen.getByRole('button', { name: 'בית' }))

    expect(screen.getByRole('group', { name: 'לוח המשחק' })).toBeInTheDocument()
    expect(window.location.href).toBe(startHref)
  })
})
