import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { StrictMode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../App.tsx'
import { unlockAudio } from '../audio/audioEngine.ts'
import { BOARD_COLORS, TOTAL_ROUNDS, type SimonColor } from '../game/colors.ts'
import { STORAGE_KEY, type GameResult } from '../history/historyRepository.ts'

vi.mock('../audio/audioEngine.ts', () => ({
  unlockAudio: vi.fn(),
  playTone: vi.fn(),
  playWinSound: vi.fn(),
  playLossSound: vi.fn(),
  stopAll: vi.fn(),
}))

vi.mock('canvas-confetti', () => ({
  default: Object.assign(vi.fn(), { reset: vi.fn() }),
}))

// Math.random is fixed so every color in the sequence is green.
const renderApp = () =>
  render(
    <StrictMode>
      <App />
    </StrictMode>,
  )

const press = (color: SimonColor) => {
  const board = screen.getByRole('group', { name: 'לוח המשחק' })
  fireEvent.click(within(board).getByRole('button', { name: BOARD_COLORS.find((c) => c.id === color)!.label }))
}

const finishPresentation = () =>
  act(() => {
    vi.advanceTimersByTime(20_000)
  })

async function clickButton(name: string) {
  fireEvent.click(screen.getByRole('button', { name }))
  await act(async () => {})
}

const goTo = (tab: 'בית' | 'אודות') => fireEvent.click(screen.getByRole('button', { name: tab }))

async function loseAtRound1() {
  await clickButton('התחל')
  finishPresentation()
  press('blue')
}

async function win() {
  await clickButton('התחל')
  for (let round = 1; round <= TOTAL_ROUNDS; round++) {
    finishPresentation()
    for (let i = 0; i < round; i++) press('green')
  }
}

const historyCards = () => {
  const list = screen.queryByRole('list', { name: '10 המשחקים האחרונים' })
  return list ? within(list).getAllByRole('listitem') : []
}

const storedResults = (): GameResult[] => {
  const raw = window.localStorage.getItem(STORAGE_KEY)
  return raw ? JSON.parse(raw).results : []
}

const seed = (count: number) => {
  const results: GameResult[] = Array.from({ length: count }, (_, i) => ({
    id: `seed-${i}`,
    finishedAt: new Date(2026, 0, 20 - i, 10, 0).toISOString(),
    completedRounds: 3,
    outcome: 'loss',
  }))
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ schemaVersion: 1, results }))
}

describe('Game history', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
    vi.mocked(unlockAudio).mockResolvedValue(true)
    vi.spyOn(Math, 'random').mockReturnValue(0)
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('records a loss at round 1 once, with 0 completed rounds', async () => {
    renderApp()
    await loseAtRound1()
    expect(screen.getByRole('dialog')).toHaveTextContent('נפסלת!')

    goTo('אודות')
    const cards = historyCards()
    expect(cards).toHaveLength(1)
    expect(cards[0]).toHaveTextContent('שלבים שהושלמו: 0')
    expect(cards[0]).toHaveTextContent('תוצאה: הפסד')
    expect(within(cards[0]).getByText(/\d{2}\.\d{2}\.\d{4} \d{2}:\d{2}/)).toBeInTheDocument()
    expect(storedResults()).toHaveLength(1)
    expect(storedResults()[0]).toMatchObject({ completedRounds: 0, outcome: 'loss' })
    expect(Object.keys(storedResults()[0]).sort()).toEqual(['completedRounds', 'finishedAt', 'id', 'outcome'])
  })

  it('records a win with 10 completed rounds', async () => {
    renderApp()
    await win()
    expect(screen.getByRole('dialog')).toHaveTextContent('כל הכבוד! ניצחת!')

    goTo('אודות')
    const cards = historyCards()
    expect(cards).toHaveLength(1)
    expect(cards[0]).toHaveTextContent('שלבים שהושלמו: 10')
    expect(cards[0]).toHaveTextContent('תוצאה: ניצחון')
  })

  it('does not record the same game twice when switching screens after it ended', async () => {
    renderApp()
    await loseAtRound1()
    goTo('אודות')
    goTo('בית')
    goTo('אודות')
    goTo('בית')
    expect(storedResults()).toHaveLength(1)

    // Going back to the start screen records nothing; a new game is a new record.
    await clickButton('שחק שוב')
    expect(storedResults()).toHaveLength(1)
    await clickButton('התחל')
    finishPresentation()
    press('red')
    expect(storedResults()).toHaveLength(2)
  })

  it('pause, navigation and refresh in the middle of a game record nothing', async () => {
    const { unmount } = renderApp()
    await clickButton('התחל')
    finishPresentation()
    press('green')
    goTo('אודות')
    expect(screen.getByText('עדיין אין משחקים שמורים')).toBeInTheDocument()
    goTo('בית')
    await clickButton('המשך משחק')
    unmount() // page refresh

    renderApp()
    goTo('אודות')
    expect(screen.getByText('עדיין אין משחקים שמורים')).toBeInTheDocument()
    expect(storedResults()).toEqual([])
  })

  it('keeps saved results after a refresh', async () => {
    const { unmount } = renderApp()
    await loseAtRound1()
    unmount()

    renderApp()
    goTo('אודות')
    expect(historyCards()).toHaveLength(1)
  })

  it('shows at most 10 results, newest first, after an 11th game', async () => {
    seed(10)
    renderApp()
    await loseAtRound1()

    goTo('אודות')
    const cards = historyCards()
    expect(cards).toHaveLength(10)
    expect(cards[0]).toHaveTextContent('שלבים שהושלמו: 0')
    expect(storedResults().map((r) => r.id)).not.toContain('seed-9')
    expect(storedResults()[9].id).toBe('seed-8')
  })

  it('"ביטול" changes nothing; "מחק" empties the history', async () => {
    seed(3)
    renderApp()
    goTo('אודות')
    expect(historyCards()).toHaveLength(3)

    fireEvent.click(screen.getByRole('button', { name: 'מחק היסטוריה' }))
    const dialog = screen.getByRole('alertdialog', { name: 'למחוק את ההיסטוריה?' })
    expect(within(dialog).getByRole('button', { name: 'ביטול' })).toHaveFocus()
    fireEvent.click(within(dialog).getByRole('button', { name: 'ביטול' }))
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(historyCards()).toHaveLength(3)
    expect(storedResults()).toHaveLength(3)

    fireEvent.click(screen.getByRole('button', { name: 'מחק היסטוריה' }))
    fireEvent.click(screen.getByRole('button', { name: 'מחק' }))
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(screen.getByText('עדיין אין משחקים שמורים')).toBeInTheDocument()
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull()
    expect(screen.queryByRole('button', { name: 'מחק היסטוריה' })).not.toBeInTheDocument()
  })

  it('Escape closes the dialog without deleting', () => {
    seed(2)
    renderApp()
    goTo('אודות')
    fireEvent.click(screen.getByRole('button', { name: 'מחק היסטוריה' }))
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(historyCards()).toHaveLength(2)
  })

  it('has no "מחק היסטוריה" button when the history is empty', () => {
    renderApp()
    goTo('אודות')
    expect(screen.getByText('עדיין אין משחקים שמורים')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'מחק היסטוריה' })).not.toBeInTheDocument()
  })

  it('a failed save does not block playing and shows a Hebrew message', async () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError')
    })
    renderApp()
    await loseAtRound1()
    await clickButton('שחק שוב')
    await clickButton('התחל')
    expect(screen.getByText('המשחק מציג את הרצף')).toBeInTheDocument()

    goTo('אודות')
    expect(screen.getByRole('alert')).toHaveTextContent('לא ניתן היה לשמור את תוצאת המשחק האחרון.')
    expect(screen.getByText('עדיין אין משחקים שמורים')).toBeInTheDocument()
  })

  it('a failed delete keeps the list and shows a Hebrew message', () => {
    seed(2)
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new Error('SecurityError')
    })
    renderApp()
    goTo('אודות')
    fireEvent.click(screen.getByRole('button', { name: 'מחק היסטוריה' }))
    fireEvent.click(screen.getByRole('button', { name: 'מחק' }))
    expect(screen.getByRole('alert')).toHaveTextContent('מחיקת ההיסטוריה נכשלה. נסה שוב.')
    expect(historyCards()).toHaveLength(2)
  })

  it('unreadable storage shows a message and the game still starts', async () => {
    window.localStorage.setItem(STORAGE_KEY, '{broken')
    renderApp()
    await clickButton('התחל')
    expect(screen.getByText('המשחק מציג את הרצף')).toBeInTheDocument()

    goTo('אודות')
    expect(screen.getByRole('alert')).toHaveTextContent('לא ניתן לטעון את היסטוריית המשחקים במכשיר זה.')
  })
})
