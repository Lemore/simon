import { describe, expect, it } from 'vitest'
import type { SimonColor } from './colors.ts'
import { gameReducer, initialGameState, type GameAction, type GameState } from './gameReducer.ts'
import { randomColor } from './sequence.ts'

const run = (state: GameState, ...actions: GameAction[]) => actions.reduce(gameReducer, state)

function started(firstColor: SimonColor = 'green') {
  const presenting = gameReducer(initialGameState, { type: 'START', firstColor })
  return gameReducer(presenting, { type: 'PRESENTATION_DONE', gameId: presenting.gameId })
}

// Repeats the current sequence correctly, then lets the next presentation finish.
function completeRound(state: GameState, nextColor: SimonColor): GameState {
  let next = state
  for (const color of state.sequence) {
    next = gameReducer(next, { type: 'PRESS', color, nextColor })
  }
  if (next.status === 'presenting') {
    next = gameReducer(next, { type: 'PRESENTATION_DONE', gameId: next.gameId })
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

  it('ignores a stale PRESENTATION_DONE from another game', () => {
    const presenting = gameReducer(initialGameState, { type: 'START', firstColor: 'green' })
    const stale = gameReducer(presenting, { type: 'PRESENTATION_DONE', gameId: presenting.gameId - 1 })
    expect(stale).toBe(presenting)
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
})
