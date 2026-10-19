import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../App.tsx'
import { playTone, stopAll, unlockAudio } from '../audio/audioEngine.ts'
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

const advance = (ms: number) => {
  act(() => {
    vi.advanceTimersByTime(ms)
  })
}

const finishPresentation = () => advance(20_000)

const toneColors = () => vi.mocked(playTone).mock.calls.map(([color]) => color)

const litPads = () => BOARD_COLORS.filter((c) => pad(c.id).classList.contains('is-lit'))

async function clickButton(name: string) {
  fireEvent.click(screen.getByRole('button', { name }))
  // Let the async audio unlock resolve.
  await act(async () => {})
}

const goTo = (tab: 'בית' | 'אודות') => {
  fireEvent.click(screen.getByRole('button', { name: tab }))
}

function setVisibility(state: 'hidden' | 'visible') {
  Object.defineProperty(document, 'visibilityState', { configurable: true, value: state })
  act(() => {
    document.dispatchEvent(new Event('visibilitychange'))
  })
}

const nextRandomColor = (color: SimonColor) => vi.mocked(Math.random).mockReturnValue(RANDOM_FOR[color])

// Plays a game with the sequence green, red, yellow until round 3 is being presented.
async function reachRound3Presentation() {
  nextRandomColor('green')
  await clickButton('התחל')
  finishPresentation()
  nextRandomColor('red')
  press('green')
  finishPresentation()
  press('green')
  nextRandomColor('yellow')
  press('red')
  expect(screen.getByText('שלב 3 מתוך 10')).toBeInTheDocument()
}

describe('Pause and resume', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
    vi.mocked(unlockAudio).mockResolvedValue(true)
    vi.spyOn(Math, 'random').mockReturnValue(RANDOM_FOR.green)
  })

  afterEach(() => {
    setVisibility('visible')
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('going to "אודות" mid-presentation stops light and sound at once and does not continue', async () => {
    render(<App />)
    await reachRound3Presentation()
    advance(800) // first color is lit
    goTo('אודות')
    expect(stopAll).toHaveBeenCalled()

    vi.mocked(playTone).mockClear()
    finishPresentation()
    expect(playTone).not.toHaveBeenCalled()

    goTo('בית')
    expect(screen.getByText('המשחק מושהה')).toBeInTheDocument()
    expect(screen.getByText('שלב 3 מתוך 10')).toBeInTheDocument()
    expect(litPads()).toEqual([])
    expect(pad('green')).toBeDisabled()
    expect(pad('green')).toHaveClass('is-dimmed')
  })

  it('returning home never resumes by itself; only "המשך משחק" replays the full sequence', async () => {
    render(<App />)
    await reachRound3Presentation()
    goTo('אודות')
    goTo('בית')

    vi.mocked(playTone).mockClear()
    finishPresentation()
    expect(playTone).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'המשך משחק' })).toBeInTheDocument()

    await clickButton('המשך משחק')
    expect(screen.getByText('המשחק מציג את הרצף')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'המשך משחק' })).not.toBeInTheDocument()
    finishPresentation()
    expect(toneColors()).toEqual(['green', 'red', 'yellow'])
    expect(screen.getByText('התור שלך')).toBeInTheDocument()
    expect(screen.getByText('שלב 3 מתוך 10')).toBeInTheDocument()
  })

  it('pausing during the player turn drops the partial input and resumes without replaying', async () => {
    render(<App />)
    await reachRound3Presentation()
    finishPresentation()
    press('green')
    press('red')
    expect(pad('red')).toHaveClass('is-lit')

    goTo('אודות')
    goTo('בית')
    expect(litPads()).toEqual([])
    expect(screen.getByText('המשחק מושהה')).toBeInTheDocument()

    vi.mocked(playTone).mockClear()
    await clickButton('המשך משחק')
    finishPresentation()
    // The sequence was already seen, so it is not shown again.
    expect(playTone).not.toHaveBeenCalled()
    expect(screen.getByText('התור שלך')).toBeInTheDocument()
    expect(pad('green')).toBeEnabled()

    // The player repeats the sequence from the start.
    press('green')
    press('red')
    press('yellow')
    finishPresentation()
    expect(screen.getByText('שלב 4 מתוך 10')).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('cannot be used to see the sequence again: a replay happens only for a pause during the presentation', async () => {
    render(<App />)
    await reachRound3Presentation()
    goTo('אודות')
    goTo('בית')

    vi.mocked(playTone).mockClear()
    await clickButton('המשך משחק')
    finishPresentation()
    expect(toneColors()).toEqual(['green', 'red', 'yellow'])

    // Pausing again during the player turn does not replay it.
    goTo('אודות')
    goTo('בית')
    vi.mocked(playTone).mockClear()
    await clickButton('המשך משחק')
    finishPresentation()
    expect(playTone).not.toHaveBeenCalled()
    expect(screen.getByText('התור שלך')).toBeInTheDocument()
  })

  it('hiding the app pauses the same way and becoming visible does not resume', async () => {
    render(<App />)
    await reachRound3Presentation()
    setVisibility('hidden')
    expect(stopAll).toHaveBeenCalled()

    vi.mocked(playTone).mockClear()
    finishPresentation()
    setVisibility('visible')
    finishPresentation()
    expect(playTone).not.toHaveBeenCalled()
    expect(screen.getByText('המשחק מושהה')).toBeInTheDocument()

    await clickButton('המשך משחק')
    finishPresentation()
    expect(toneColors()).toEqual(['green', 'red', 'yellow'])
    expect(screen.getByText('התור שלך')).toBeInTheDocument()
  })

  it('pagehide pauses during the player turn', async () => {
    render(<App />)
    await reachRound3Presentation()
    finishPresentation()
    press('green')

    act(() => {
      window.dispatchEvent(new Event('pagehide'))
    })
    expect(screen.getByText('המשחק מושהה')).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('a double tap on "המשך משחק" presents the sequence only once', async () => {
    render(<App />)
    await reachRound3Presentation()
    goTo('אודות')
    goTo('בית')

    vi.mocked(playTone).mockClear()
    const resumeButton = screen.getByRole('button', { name: 'המשך משחק' })
    fireEvent.click(resumeButton)
    fireEvent.click(resumeButton)
    await act(async () => {})
    finishPresentation()
    expect(toneColors()).toEqual(['green', 'red', 'yellow'])
    expect(unlockAudio).toHaveBeenCalledTimes(2) // start + one resume
  })

  it('stays paused with a Hebrew message when audio cannot be resumed', async () => {
    render(<App />)
    await reachRound3Presentation()
    setVisibility('hidden')
    setVisibility('visible')

    vi.mocked(unlockAudio).mockResolvedValueOnce(false)
    vi.mocked(playTone).mockClear()
    await clickButton('המשך משחק')
    finishPresentation()
    expect(screen.getByText('לא ניתן להפעיל את הצלילים. נסה ללחוץ שוב.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'המשך משחק' })).toBeInTheDocument()
    expect(playTone).not.toHaveBeenCalled()

    await clickButton('המשך משחק')
    expect(screen.getByText('המשחק מציג את הרצף')).toBeInTheDocument()
  })

  it('shows no "המשך משחק" before a game or after it ends, and hiding then changes nothing', async () => {
    render(<App />)
    setVisibility('hidden')
    setVisibility('visible')
    goTo('אודות')
    goTo('בית')
    expect(screen.getByRole('button', { name: 'התחל' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'המשך משחק' })).not.toBeInTheDocument()

    await clickButton('התחל')
    finishPresentation()
    press('blue')
    goTo('אודות')
    goTo('בית')
    expect(screen.getByRole('dialog')).toHaveTextContent('נפסלת!')
    expect(screen.queryByRole('button', { name: 'המשך משחק' })).not.toBeInTheDocument()
  })

  it('a page refresh (remount) drops a paused game', async () => {
    const { unmount } = render(<App />)
    await reachRound3Presentation()
    goTo('אודות')
    unmount()

    render(<App />)
    expect(screen.getByRole('button', { name: 'התחל' })).toBeInTheDocument()
    expect(screen.getByText('שלב 1 מתוך 10')).toBeInTheDocument()
  })
})
