import confetti from 'canvas-confetti'
import { useCallback, useEffect, useLayoutEffect, useReducer, useRef, useState } from 'react'
import { playLossSound, playTone, playWinSound, stopAll, unlockAudio } from '../audio/audioEngine.ts'
import type { SimonColor } from './colors.ts'
import { gameReducer, initialGameState } from './gameReducer.ts'
import { playSequence } from './playback.ts'
import { randomColor } from './sequence.ts'
import { END_SOUND_DELAY_MS, PRESS_FEEDBACK_MS } from './timing.ts'

function launchConfetti() {
  const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
  void confetti({
    particleCount: reducedMotion ? 40 : 160,
    spread: 90,
    startVelocity: reducedMotion ? 25 : 45,
    origin: { y: 0.45 },
    colors: ['#00d26a', '#ff3b30', '#ffd600', '#00a3ff'],
  })
}

// Owns the active game. Kept in memory only: a page refresh always starts from idle.
export function useGame() {
  const [state, dispatch] = useReducer(gameReducer, initialGameState)
  const [litColor, setLitColor] = useState<SimonColor | null>(null)
  const [audioError, setAudioError] = useState(false)
  const pressTimer = useRef<number | undefined>(undefined)
  const resuming = useRef(false)
  // Latest status, for event handlers that must not re-subscribe on every change.
  const statusRef = useRef(state.status)
  useLayoutEffect(() => {
    statusRef.current = state.status
  }, [state.status])

  // Sequence playback while presenting; cancelled on any state change (e.g. pause) or unmount.
  useEffect(() => {
    if (state.status !== 'presenting') return
    const controller = new AbortController()
    const presentationId = state.presentationId
    playSequence(state.sequence, {
      onLight: setLitColor,
      onDone: () => dispatch({ type: 'PRESENTATION_DONE', presentationId }),
      signal: controller.signal,
    })
    return () => controller.abort()
  }, [state.status, state.presentationId, state.sequence])

  // End-of-game feedback: sound for both outcomes, confetti on a win only.
  useEffect(() => {
    if (state.status !== 'won' && state.status !== 'lost') return
    const won = state.status === 'won'
    const timer = window.setTimeout(() => {
      if (won) {
        playWinSound()
        launchConfetti()
      } else {
        playLossSound()
      }
    }, END_SOUND_DELAY_MS)
    return () => {
      window.clearTimeout(timer)
      if (won) confetti.reset()
    }
  }, [state.status, state.gameId])

  useEffect(() => () => window.clearTimeout(pressTimer.current), [])

  // Pauses an active game and silences it immediately. Safe to call in any state.
  const pause = useCallback(() => {
    const status = statusRef.current
    if (status !== 'presenting' && status !== 'awaitingInput') return
    window.clearTimeout(pressTimer.current)
    setLitColor(null)
    stopAll()
    dispatch({ type: 'PAUSE' })
  }, [])

  // Hiding the app (other app, locked phone, other tab) pauses; coming back never resumes by itself.
  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') pause()
    }
    document.addEventListener('visibilitychange', onVisibilityChange)
    window.addEventListener('pagehide', pause)
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange)
      window.removeEventListener('pagehide', pause)
    }
  }, [pause])

  const start = useCallback(async () => {
    const ok = await unlockAudio()
    if (!ok) {
      setAudioError(true)
      return
    }
    setAudioError(false)
    dispatch({ type: 'START', firstColor: randomColor() })
  }, [])

  // Called from the "המשך משחק" tap, which also re-unlocks audio after the app was in the background.
  const resume = useCallback(async () => {
    if (resuming.current || statusRef.current !== 'paused') return
    resuming.current = true
    try {
      const ok = await unlockAudio()
      setAudioError(!ok)
      if (ok) dispatch({ type: 'RESUME' })
    } finally {
      resuming.current = false
    }
  }, [])

  const reset = useCallback(() => dispatch({ type: 'RESET' }), [])

  const pressPad = useCallback(
    (color: SimonColor) => {
      if (state.status !== 'awaitingInput') return
      playTone(color, PRESS_FEEDBACK_MS)
      setLitColor(color)
      window.clearTimeout(pressTimer.current)
      pressTimer.current = window.setTimeout(() => setLitColor(null), PRESS_FEEDBACK_MS)
      dispatch({ type: 'PRESS', color, nextColor: randomColor() })
    },
    [state.status],
  )

  return { state, litColor, audioError, start, pause, resume, reset, pressPad }
}
