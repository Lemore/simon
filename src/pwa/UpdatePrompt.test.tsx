import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import UpdatePrompt from './UpdatePrompt.tsx'

const sw = vi.hoisted(() => ({
  needRefresh: true,
  setNeedRefresh: vi.fn(),
  updateServiceWorker: vi.fn(() => Promise.resolve()),
}))

vi.mock('virtual:pwa-register/react', () => ({
  useRegisterSW: () => ({
    needRefresh: [sw.needRefresh, sw.setNeedRefresh],
    offlineReady: [false, vi.fn()],
    updateServiceWorker: sw.updateServiceWorker,
  }),
}))

describe('UpdatePrompt', () => {
  beforeEach(() => {
    sw.needRefresh = true
    sw.setNeedRefresh.mockClear()
    sw.updateServiceWorker.mockClear()
  })

  it('stays hidden while a game is active, so the page is never reloaded mid-game', () => {
    render(<UpdatePrompt gameActive />)
    expect(screen.queryByText('גרסה חדשה זמינה')).not.toBeInTheDocument()
    expect(sw.updateServiceWorker).not.toHaveBeenCalled()
  })

  it('shows the offer when no game is active and updates only on "עדכן"', async () => {
    render(<UpdatePrompt gameActive={false} />)
    expect(screen.getByRole('status')).toHaveTextContent('גרסה חדשה זמינה')
    expect(sw.updateServiceWorker).not.toHaveBeenCalled()

    await userEvent.click(screen.getByRole('button', { name: 'עדכן' }))
    expect(sw.updateServiceWorker).toHaveBeenCalledWith(true)
  })

  it('"לא עכשיו" dismisses the offer without updating', async () => {
    render(<UpdatePrompt gameActive={false} />)
    await userEvent.click(screen.getByRole('button', { name: 'לא עכשיו' }))
    expect(sw.setNeedRefresh).toHaveBeenCalledWith(false)
    expect(sw.updateServiceWorker).not.toHaveBeenCalled()
  })

  it('shows nothing when no new version is waiting', () => {
    sw.needRefresh = false
    render(<UpdatePrompt gameActive={false} />)
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('appears once the active game ends', () => {
    const { rerender } = render(<UpdatePrompt gameActive />)
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    rerender(<UpdatePrompt gameActive={false} />)
    expect(screen.getByRole('status')).toBeInTheDocument()
  })
})
