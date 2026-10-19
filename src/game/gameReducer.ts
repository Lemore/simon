import { FIRST_ROUND, TOTAL_ROUNDS, type SimonColor } from './colors.ts'

export type GameStatus = 'idle' | 'presenting' | 'awaitingInput' | 'won' | 'lost'

export type GameState = {
  status: GameStatus
  sequence: SimonColor[]
  round: number
  inputIndex: number
  completedRounds: number
  // Increments on every new game; lets stale async callbacks be ignored.
  gameId: number
}

// Random colors are chosen outside the reducer and passed in, so the reducer stays pure.
export type GameAction =
  | { type: 'START'; firstColor: SimonColor }
  | { type: 'PRESENTATION_DONE'; gameId: number }
  | { type: 'PRESS'; color: SimonColor; nextColor: SimonColor }

export const initialGameState: GameState = {
  status: 'idle',
  sequence: [],
  round: FIRST_ROUND,
  inputIndex: 0,
  completedRounds: 0,
  gameId: 0,
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'START':
      if (state.status === 'presenting' || state.status === 'awaitingInput') return state
      return {
        status: 'presenting',
        sequence: [action.firstColor],
        round: FIRST_ROUND,
        inputIndex: 0,
        completedRounds: 0,
        gameId: state.gameId + 1,
      }

    case 'PRESENTATION_DONE':
      if (state.status !== 'presenting' || action.gameId !== state.gameId) return state
      return { ...state, status: 'awaitingInput', inputIndex: 0 }

    case 'PRESS': {
      if (state.status !== 'awaitingInput') return state

      if (action.color !== state.sequence[state.inputIndex]) {
        return { ...state, status: 'lost', completedRounds: state.round - 1 }
      }

      const nextIndex = state.inputIndex + 1
      if (nextIndex < state.sequence.length) {
        return { ...state, inputIndex: nextIndex }
      }

      // The whole sequence of this round was repeated correctly.
      if (state.round >= TOTAL_ROUNDS) {
        return { ...state, status: 'won', inputIndex: nextIndex, completedRounds: TOTAL_ROUNDS }
      }
      return {
        ...state,
        status: 'presenting',
        sequence: [...state.sequence, action.nextColor],
        round: state.round + 1,
        inputIndex: 0,
        completedRounds: state.round,
      }
    }
  }
}
