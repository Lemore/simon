import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { playTone, stopAll } from '../audio/audioEngine.ts'
import type { SimonColor } from './colors.ts'
import { playSequence } from './playback.ts'
import { GAP_MS, LEAD_IN_MS, LIGHT_MS } from './timing.ts'

vi.mock('../audio/audioEngine.ts', () => ({
  playTone: vi.fn(),
  stopAll: vi.fn(),
}))

// Records when each color lights up, relative to the start.
function record(sequence: SimonColor[]) {
  const lights: { color: SimonColor; at: number }[] = []
  const start = Date.now()
  const onDone = vi.fn()
  const controller = new AbortController()
  const onLight = vi.fn((color: SimonColor | null) => {
    if (color) lights.push({ color, at: Date.now() - start })
  })
  playSequence(sequence, { onLight, onDone, signal: controller.signal })
  return { lights, onDone, onLight, controller }
}

describe('playSequence', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
  })
  afterEach(() => vi.useRealTimers())

  it('lights and sounds each color in order, then finishes once', () => {
    const { lights, onDone } = record(['red', 'red', 'blue'])
    vi.runAllTimers()

    expect(lights.map((light) => light.color)).toEqual(['red', 'red', 'blue'])
    expect(vi.mocked(playTone).mock.calls).toEqual([
      ['red', LIGHT_MS],
      ['red', LIGHT_MS],
      ['blue', LIGHT_MS],
    ])
    expect(onDone).toHaveBeenCalledTimes(1)
  })

  it('keeps the same pace for short and long sequences', () => {
    const step = LIGHT_MS + GAP_MS
    const short = record(['green', 'yellow'])
    vi.runAllTimers()
    const long = record(['green', 'yellow', 'red', 'blue', 'green', 'red', 'yellow', 'blue', 'green', 'red'])
    vi.runAllTimers()

    const expected = (count: number) => Array.from({ length: count }, (_, i) => LEAD_IN_MS + i * step)
    expect(short.lights.map((light) => light.at)).toEqual(expected(2))
    expect(long.lights.map((light) => light.at)).toEqual(expected(10))
  })

  it('stops everything immediately when aborted', () => {
    const { onDone, onLight, controller } = record(['green', 'red', 'blue'])
    vi.advanceTimersByTime(LEAD_IN_MS + 10)
    expect(onLight).toHaveBeenLastCalledWith('green')

    controller.abort()
    expect(stopAll).toHaveBeenCalledTimes(1)
    expect(onLight).toHaveBeenLastCalledWith(null)

    onLight.mockClear()
    vi.runAllTimers()
    expect(onLight).not.toHaveBeenCalled()
    expect(onDone).not.toHaveBeenCalled()
    expect(playTone).toHaveBeenCalledTimes(1)
  })
})
