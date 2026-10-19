import { describe, expect, it } from 'vitest'
import type { SimonColor } from './colors.ts'
import { gameReducer, initialGameState, type GameAction, type GameState } from './gameReducer.ts'
import { randomColor } from './sequence.ts'

const run = (state: GameState, ...actions: GameAction[]) => actions.reduce(gameReducer, state)

function started(firstColor: SimonColor = 'green') {
  const presenting = gameReducer(initialGameState, { type: 'START', firstColor })
  return gameReducer(presenting, { type: 'PRESENTATION_DONE', presentationId: presenting.presentationId })
}

// Repeats the current sequence correctly, then lets the next presentation finish.
function completeRound(state: GameState, nextColor: SimonColor): GameState {
  let next = state
  for (const color of state.sequence) {
    next = gameReducer(next, { type: 'PRESS', color, nextColor })
  }
  if (next.status === 'presenting') {
    next = gameReducer(next, { type: 'PRESENTATION_DONE', presentationId: next.presentationId })
  }
  return next
}

const wrongColor = (color: SimonColor): SimonColor => (color === 'red' ? 'blue' : 'red')

describe('gameReducer', () => {
  it('starts round 1 with a single color and zero completed rounds', () => {
    const state = gameReducer(initialGameState, { type: 'START', firstColor: 'yellow' })
    expect(state).toMatchObject({
      status: 'presenting',
      sequence: ['yellow'],
      round: 1,
      inputIndex: 0,
      completedRounds: 0,
      gameId: 1,
    })
  })

  it('grows the sequence by one color per round, keeping the previous one as a prefix', () => {
    let state = started('green')
    const lengths = [state.sequence.length]
    const colors: SimonColor[] = ['green', 'red', 'red', 'blue', 'yellow', 'green', 'green', 'blue', 'red']

    for (const color of colors) {
      const previous = state.sequence
      state = completeRound(state, color)
      expect(state.sequence.slice(0, previous.length)).toEqual(previous)
      lengths.push(state.sequence.length)
    }

    expect(lengths).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
    expect(state.round).toBe(10)
    expect(state.status).toBe('awaitingInput')
    // Repeated colors are allowed, including back to back.
    expect(state.sequence.slice(0, 2)).toEqual(['green', 'green'])
  })

  it('ignores presses outside the player turn', () => {
    const presenting = gameReducer(initialGameState, { type: 'START', firstColor: 'green' })
    const press: GameAction = { type: 'PRESS', color: 'red', nextColor: 'red' }

    expect(gameReducer(initialGameState, press)).toBe(initialGameState)
    expect(gameReducer(presenting, press)).toBe(presenting)
  })

  it('loses with 0 completed rounds on a wrong first press in round 1', () => {
    const state = run(started('green'), { type: 'PRESS', color: 'blue', nextColor: 'red' })
    expect(state.status).toBe('lost')
    expect(state.completedRounds).toBe(0)
    // No second chance.
    expect(gameReducer(state, { type: 'PRESS', color: 'green', nextColor: 'red' })).toBe(state)
  })

  it('loses mid-sequence in an advanced round with the correct completed count', () => {
    let state = started('green')
    for (const color of ['red', 'yellow', 'blue'] as SimonColor[]) state = completeRound(state, color)
    expect(state.round).toBe(4)

    state = run(
      state,
      { type: 'PRESS', color: state.sequence[0], nextColor: 'red' },
      { type: 'PRESS', color: state.sequence[1], nextColor: 'red' },
      { type: 'PRESS', color: wrongColor(state.sequence[2]), nextColor: 'red' },
    )
    expect(state.status).toBe('lost')
    expect(state.round).toBe(4)
    expect(state.completedRounds).toBe(3)
  })

  it('advances the input index on correct presses without finishing the round early', () => {
    let state = started('green')
    state = completeRound(state, 'red')
    state = gameReducer(state, { type: 'PRESS', color: 'green', nextColor: 'blue' })
    expect(state).toMatchObject({ status: 'awaitingInput', inputIndex: 1, round: 2, completedRounds: 1 })
  })

  it('wins after completing round 10 and never reaches round 11', () => {
    let state = started('blue')
    for (let i = 0; i < 9; i++) state = completeRound(state, 'yellow')
    expect(state.round).toBe(10)

    state = completeRound(state, 'red')
    expect(state.status).toBe('won')
    expect(state.completedRounds).toBe(10)
    expect(state.round).toBe(10)
    expect(state.sequence).toHaveLength(10)
    expect(gameReducer(state, { type: 'PRESS', color: 'blue', nextColor: 'red' })).toBe(state)
  })

  it('starts a fresh game from a finished one', () => {
    const lost = run(started('green'), { type: 'PRESS', color: 'red', nextColor: 'red' })
    const again = gameReducer(lost, { type: 'START', firstColor: 'yellow' })
    expect(again).toMatchObject({ status: 'presenting', sequence: ['yellow'], round: 1, completedRounds: 0 })
    expect(again.gameId).toBe(lost.gameId + 1)
  })

  it('ignores START while a game is active', () => {
    const presenting = gameReducer(initialGameState, { type: 'START', firstColor: 'green' })
    expect(gameReducer(presenting, { type: 'START', firstColor: 'red' })).toBe(presenting)
  })

  it('ignores a stale PRESENTATION_DONE from an earlier presentation', () => {
    const presenting = gameReducer(initialGameState, { type: 'START', firstColor: 'green' })
    const stale = gameReducer(presenting, {
      type: 'PRESENTATION_DONE',
      presentationId: presenting.presentationId - 1,
    })
    expect(stale).toBe(presenting)
  })
})

describe('gameReducer pause and resume', () => {
  // Round 3, two correct presses into the player's turn.
  function midInput() {
    let state = started('green')
    state = completeRound(state, 'red')
    state = completeRound(state, 'blue')
    return run(
      state,
      { type: 'PRESS', color: state.sequence[0], nextColor: 'red' },
      { type: 'PRESS', color: state.sequence[1], nextColor: 'red' },
    )
  }

  it('pauses during the presentation, keeping sequence and round', () => {
    const presenting = gameReducer(initialGameState, { type: 'START', firstColor: 'yellow' })
    const paused = gameReducer(presenting, { type: 'PAUSE' })
    expect(paused).toEqual({ ...presenting, status: 'paused', pausedFrom: 'presenting' })
  })

  it('pauses during input and drops the partial input of the round', () => {
    const state = midInput()
    expect(state.inputIndex).toBe(2)
    const paused = gameReducer(state, { type: 'PAUSE' })
    expect(paused).toMatchObject({
      status: 'paused',
      inputIndex: 0,
      round: 3,
      completedRounds: 2,
      sequence: ['green', 'red', 'blue'],
    })
  })

  it('ignores PAUSE when no game is active or it is already paused', () => {
    const lost = run(started('green'), { type: 'PRESS', color: 'red', nextColor: 'red' })
    const won = { ...lost, status: 'won' as const }
    const paused = gameReducer(started('green'), { type: 'PAUSE' })
    for (const state of [initialGameState, lost, won, paused]) {
      expect(gameReducer(state, { type: 'PAUSE' })).toBe(state)
    }
  })

  it('resumes a game paused during the presentation by presenting the full sequence again', () => {
    let state = completeRound(completeRound(started('green'), 'red'), 'blue')
    state = completeRound(state, 'yellow')
    // Round 4 is being presented after the last correct press.
    state = run(state, ...state.sequence.map((color) => ({ type: 'PRESS', color, nextColor: 'yellow' }) as GameAction))
    expect(state.status).toBe('presenting')

    const paused = gameReducer(state, { type: 'PAUSE' })
    const resumed = gameReducer(paused, { type: 'RESUME' })
    expect(resumed).toMatchObject({
      status: 'presenting',
      inputIndex: 0,
      round: state.round,
      sequence: state.sequence,
      gameId: state.gameId,
      pausedFrom: null,
    })
    expect(resumed.presentationId).toBe(paused.presentationId + 1)
  })

  it('resumes a game paused during the player turn straight to input, without replaying', () => {
    const paused = gameReducer(midInput(), { type: 'PAUSE' })
    const resumed = gameReducer(paused, { type: 'RESUME' })
    expect(resumed).toMatchObject({
      status: 'awaitingInput',
      inputIndex: 0,
      round: 3,
      completedRounds: 2,
      sequence: ['green', 'red', 'blue'],
      pausedFrom: null,
    })
    expect(resumed.presentationId).toBe(paused.presentationId)

    // The player then repeats the sequence from the start.
    const next = completeRound(resumed, 'yellow')
    expect(next).toMatchObject({ status: 'awaitingInput', round: 4, completedRounds: 3 })
  })

  it('ignores RESUME unless paused (a double resume presents once)', () => {
    const resumed = run(started('green'), { type: 'PAUSE' }, { type: 'RESUME' })
    expect(gameReducer(resumed, { type: 'RESUME' })).toBe(resumed)
    expect(gameReducer(initialGameState, { type: 'RESUME' })).toBe(initialGameState)
  })

  it('ignores the completion of a presentation cancelled by the pause', () => {
    const presenting = gameReducer(initialGameState, { type: 'START', firstColor: 'green' })
    const resumed = run(presenting, { type: 'PAUSE' }, { type: 'RESUME' })
    const stale = gameReducer(resumed, {
      type: 'PRESENTATION_DONE',
      presentationId: presenting.presentationId,
    })
    expect(stale).toBe(resumed)
  })

  it('ignores presses and START while paused, and never turns a pause into a loss', () => {
    const paused = gameReducer(started('green'), { type: 'PAUSE' })
    expect(gameReducer(paused, { type: 'PRESS', color: 'red', nextColor: 'red' })).toBe(paused)
    expect(gameReducer(paused, { type: 'START', firstColor: 'red' })).toBe(paused)
    expect(paused.status).toBe('paused')
    expect(paused.completedRounds).toBe(0)
  })
})

describe('randomColor', () => {
  it('maps the random range onto all four colors', () => {
    expect([0, 0.3, 0.6, 0.99].map((value) => randomColor(() => value))).toEqual([
      'green',
      'red',
      'yellow',
      'blue',
    ])
  })

  describe('RESET', () => {
    it('goes from a finished game back to idle, keeping the ids counting', () => {
      let state = gameReducer(initialGameState, { type: 'START', firstColor: 'green' })
      state = gameReducer(state, { type: 'PRESENTATION_DONE', presentationId: state.presentationId })
      state = gameReducer(state, { type: 'PRESS', color: 'red', nextColor: 'blue' })
      expect(state.status).toBe('lost')

      const reset = gameReducer(state, { type: 'RESET' })
      expect(reset).toEqual({ ...initialGameState, gameId: state.gameId, presentationId: state.presentationId })

      const next = gameReducer(reset, { type: 'START', firstColor: 'yellow' })
      expect(next.gameId).toBe(state.gameId + 1)
    })

    it('is ignored while a game is active or paused', () => {
      const presenting = gameReducer(initialGameState, { type: 'START', firstColor: 'green' })
      expect(gameReducer(presenting, { type: 'RESET' })).toBe(presenting)
      const paused = gameReducer(presenting, { type: 'PAUSE' })
      expect(gameReducer(paused, { type: 'RESET' })).toBe(paused)
    })
  })
})
