import { act, fireEvent, render, screen, within } from '@testing-library/react'
import confetti from 'canvas-confetti'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../App.tsx'
import { playLossSound, playTone, playWinSound, unlockAudio } from '../audio/audioEngine.ts'
import { BOARD_COLORS, type SimonColor } from '../game/colors.ts'

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

// Math.random values that pick each color (see randomColor).
const RANDOM_FOR: Record<SimonColor, number> = { green: 0, red: 0.3, yellow: 0.6, blue: 0.9 }

const pad = (color: SimonColor) =>
  within(screen.getByRole('group', { name: 'לוח המשחק' })).getByRole('button', {
    name: BOARD_COLORS.find((c) => c.id === color)!.label,
  })

const press = (color: SimonColor) => {
  fireEvent.click(pad(color))
}

const finishPresentation = () => {
  act(() => {
    vi.advanceTimersByTime(20_000)
  })
}

async function clickStart(name: 'התחל' | 'שחק שוב' = 'התחל') {
  fireEvent.click(screen.getByRole('button', { name }))
  // Let the async audio unlock resolve.
  await act(async () => {})
}

describe('Home screen game flow', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
    vi.mocked(unlockAudio).mockResolvedValue(true)
    vi.spyOn(Math, 'random').mockReturnValue(RANDOM_FOR.green)
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('presents the sequence with input blocked, then hands the turn to the player', async () => {
    render(<App />)
    await clickStart()

    expect(screen.getByText('המשחק מציג את הרצף')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'התחל' })).not.toBeInTheDocument()
    expect(pad('red')).toBeDisabled()
    press('red')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    finishPresentation()
    expect(playTone).toHaveBeenCalledWith('green', expect.any(Number))
    expect(screen.getByText('התור שלך')).toBeInTheDocument()
    expect(screen.getByText('הקש על הצבעים לפי הסדר')).toBeInTheDocument()
    expect(pad('red')).toBeEnabled()
  })

  it('plays a different tone for each pad when the player taps it', async () => {
    render(<App />)
    await clickStart()
    finishPresentation()
    vi.mocked(playTone).mockClear()

    // Correct tap first (green), then the wrong ones end the game, so check tones one at a time.
    press('green')
    expect(playTone).toHaveBeenLastCalledWith('green', expect.any(Number))
    expect(pad('green')).toHaveClass('is-lit')
    finishPresentation()

    press('green')
    press('red')
    expect(playTone).toHaveBeenLastCalledWith('red', expect.any(Number))
    const tonesPlayed = new Set(vi.mocked(playTone).mock.calls.map(([color]) => color))
    expect(tonesPlayed).toEqual(new Set(['green', 'red']))
  })

  it('loses on the first wrong press of round 1 with 0 completed rounds and no confetti', async () => {
    render(<App />)
    await clickStart()
    finishPresentation()

    press('blue')
    expect(screen.getByRole('dialog')).toHaveTextContent('נפסלת!')
    expect(screen.getByRole('dialog')).toHaveTextContent('השלמת 0 שלבים')
    expect(screen.getByText('שלב 1 מתוך 10')).toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(playLossSound).toHaveBeenCalledTimes(1)
    expect(playWinSound).not.toHaveBeenCalled()
    expect(confetti).not.toHaveBeenCalled()
  })

  it('loses in an advanced round with the number of completed rounds', async () => {
    render(<App />)
    await clickStart()

    for (let round = 1; round <= 4; round++) {
      finishPresentation()
      for (let i = 0; i < round; i++) press('green')
    }
    finishPresentation()
    expect(screen.getByText('שלב 5 מתוך 10')).toBeInTheDocument()

    press('green')
    press('green')
    press('yellow')
    expect(screen.getByRole('dialog')).toHaveTextContent('נפסלת!')
    expect(screen.getByRole('dialog')).toHaveTextContent('השלמת 4 שלבים')
  })

  it('wins after round 10 with win sound and confetti, never reaching round 11', async () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem')
    render(<App />)
    await clickStart()

    for (let round = 1; round <= 10; round++) {
      finishPresentation()
      expect(screen.getByText(`שלב ${round} מתוך 10`)).toBeInTheDocument()
      for (let i = 0; i < round; i++) press('green')
    }

    expect(screen.getByRole('dialog')).toHaveTextContent('כל הכבוד! ניצחת!')
    expect(screen.getByRole('dialog')).toHaveTextContent('השלמת 10 שלבים')
    expect(screen.getByText('שלב 10 מתוך 10')).toBeInTheDocument()
    expect(screen.queryByText('שלב 11 מתוך 10')).not.toBeInTheDocument()
    expect(pad('green')).toBeDisabled()

    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(playWinSound).toHaveBeenCalledTimes(1)
    expect(playLossSound).not.toHaveBeenCalled()
    expect(confetti).toHaveBeenCalledTimes(1)
    // The active game is never persisted.
    expect(setItem).not.toHaveBeenCalled()
  })

  it('"שחק שוב" starts a new game from round 1 with a new random sequence', async () => {
    render(<App />)
    await clickStart()
    finishPresentation()
    press('green')
    finishPresentation()
    press('red')
    expect(screen.getByRole('dialog')).toHaveTextContent('השלמת שלב אחד')

    vi.mocked(Math.random).mockReturnValue(RANDOM_FOR.blue)
    vi.mocked(playTone).mockClear()
    await clickStart('שחק שוב')

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByText('שלב 1 מתוך 10')).toBeInTheDocument()
    finishPresentation()
    expect(vi.mocked(playTone).mock.calls).toEqual([['blue', expect.any(Number)]])

    press('blue')
    finishPresentation()
    expect(screen.getByText('שלב 2 מתוך 10')).toBeInTheDocument()
  })

  it('shows a Hebrew message and does not start when audio cannot be unlocked', async () => {
    vi.mocked(unlockAudio).mockResolvedValueOnce(false)
    render(<App />)
    await clickStart()

    expect(screen.getByText('לא ניתן להפעיל את הצלילים. נסה ללחוץ שוב.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'התחל' })).toBeInTheDocument()
    finishPresentation()
    expect(playTone).not.toHaveBeenCalled()

    await clickStart()
    expect(screen.queryByText('לא ניתן להפעיל את הצלילים. נסה ללחוץ שוב.')).not.toBeInTheDocument()
    expect(screen.getByText('המשחק מציג את הרצף')).toBeInTheDocument()
  })
})
