import type { SimonColor } from '../game/colors.ts'

// Pitches inspired by the original Simon device; all four are clearly distinct.
const COLOR_FREQUENCIES: Record<SimonColor, number> = {
  green: 415,
  red: 310,
  yellow: 252,
  blue: 209,
}

const UNLOCK_TIMEOUT_MS = 2000

let ctx: AudioContext | null = null
const activeOscillators = new Set<OscillatorNode>()

function isRunning(context: AudioContext) {
  return context.state === 'running'
}

// Must be called from inside a user gesture (tap on "התחל" / "המשך משחק").
// Resolves to false when sound cannot be started, so the game never runs silently by mistake.
export async function unlockAudio(): Promise<boolean> {
  try {
    const AudioCtor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AudioCtor) return false

    ctx ??= new AudioCtor()
    if (!isRunning(ctx)) {
      const timeout = new Promise<void>((resolve) => setTimeout(resolve, UNLOCK_TIMEOUT_MS))
      await Promise.race([ctx.resume(), timeout])
    }
    return isRunning(ctx)
  } catch {
    return false
  }
}

type NoteOptions = {
  type?: OscillatorType
  delayMs?: number
  peak?: number
  endFrequency?: number
}

function playNote(frequency: number, durationMs: number, options: NoteOptions = {}) {
  if (!ctx || !isRunning(ctx)) return
  const { type = 'triangle', delayMs = 0, peak = 0.3, endFrequency } = options

  const start = ctx.currentTime + delayMs / 1000
  const end = start + durationMs / 1000
  const oscillator = ctx.createOscillator()
  const gain = ctx.createGain()

  oscillator.type = type
  oscillator.frequency.setValueAtTime(frequency, start)
  if (endFrequency) oscillator.frequency.linearRampToValueAtTime(endFrequency, end)

  // Short attack/release envelope to avoid clicks.
  gain.gain.setValueAtTime(0, start)
  gain.gain.linearRampToValueAtTime(peak, start + 0.01)
  gain.gain.setValueAtTime(peak, Math.max(start + 0.01, end - 0.03))
  gain.gain.linearRampToValueAtTime(0, end)

  oscillator.connect(gain).connect(ctx.destination)
  oscillator.start(start)
  oscillator.stop(end + 0.02)

  activeOscillators.add(oscillator)
  oscillator.onended = () => {
    activeOscillators.delete(oscillator)
    gain.disconnect()
  }
}

export function playTone(color: SimonColor, durationMs: number) {
  playNote(COLOR_FREQUENCIES[color], durationMs)
}

// Short rising arpeggio.
export function playWinSound() {
  const notes = [523, 659, 784, 1047]
  notes.forEach((frequency, i) => {
    const last = i === notes.length - 1
    playNote(frequency, last ? 400 : 150, { delayMs: i * 150, peak: 0.25 })
  })
}

// Low falling buzz.
export function playLossSound() {
  playNote(220, 700, { type: 'sawtooth', peak: 0.18, endFrequency: 110 })
}

export function stopAll() {
  for (const oscillator of activeOscillators) {
    try {
      oscillator.stop()
    } catch {
      // Already stopped.
    }
  }
  activeOscillators.clear()
}
