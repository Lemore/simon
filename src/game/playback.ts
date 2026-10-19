import { playTone, stopAll } from '../audio/audioEngine.ts'
import type { SimonColor } from './colors.ts'
import { GAP_MS, LEAD_IN_MS, LIGHT_MS } from './timing.ts'

type PlaybackOptions = {
  onLight: (color: SimonColor | null) => void
  onDone: () => void
  signal: AbortSignal
}

// Lights and sounds each color in turn at a fixed pace.
// Aborting the signal cancels every pending step, stops sound and clears the highlight.
export function playSequence(sequence: readonly SimonColor[], { onLight, onDone, signal }: PlaybackOptions) {
  if (signal.aborted) return

  const timers: number[] = []
  const schedule = (step: () => void, delay: number) => {
    timers.push(
      window.setTimeout(() => {
        if (!signal.aborted) step()
      }, delay),
    )
  }

  let at = LEAD_IN_MS
  for (const color of sequence) {
    schedule(() => {
      onLight(color)
      playTone(color, LIGHT_MS)
    }, at)
    at += LIGHT_MS
    schedule(() => onLight(null), at)
    at += GAP_MS
  }
  schedule(onDone, at)

  signal.addEventListener(
    'abort',
    () => {
      timers.forEach((timer) => window.clearTimeout(timer))
      stopAll()
      onLight(null)
    },
    { once: true },
  )
}
