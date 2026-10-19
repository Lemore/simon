import { FIRST_ROUND, TOTAL_ROUNDS, type SimonColor } from './colors.ts'

export type GameStatus = 'idle' | 'presenting' | 'awaitingInput' | 'paused' | 'won' | 'lost'

export type GameState = {
  status: GameStatus
  sequence: SimonColor[]
  round: number
  inputIndex: number
  completedRounds: number
  // Increments on every new game.
  gameId: number
  // Increments every time a presentation starts (new game, next round, resume);
  // lets completions of cancelled presentations be ignored.
  presentationId: number
  // Phase the game was paused in; decides whether resuming replays the sequence.
  pausedFrom: 'presenting' | 'awaitingInput' | null
}

// Random colors are chosen outside the reducer and passed in, so the reducer stays pure.
export type GameAction =
  | { type: 'START'; firstColor: SimonColor }
  | { type: 'PRESENTATION_DONE'; presentationId: number }
  | { type: 'PRESS'; color: SimonColor; nextColor: SimonColor }
  | { type: 'PAUSE' }
  | { type: 'RESUME' }

export const initialGameState: GameState = {
  status: 'idle',
  sequence: [],
  round: FIRST_ROUND,
  inputIndex: 0,
  completedRounds: 0,
  gameId: 0,
  presentationId: 0,
  pausedFrom: null,
}

const isActive = (status: GameStatus) =>
  status === 'presenting' || status === 'awaitingInput' || status === 'paused'

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'START':
      if (isActive(state.status)) return state
      return {
        status: 'presenting',
        sequence: [action.firstColor],
        round: FIRST_ROUND,
        inputIndex: 0,
        completedRounds: 0,
        gameId: state.gameId + 1,
        presentationId: state.presentationId + 1,
        pausedFrom: null,
      }

    case 'PRESENTATION_DONE':
      if (state.status !== 'presenting' || action.presentationId !== state.presentationId) return state
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
        presentationId: state.presentationId + 1,
      }
    }

    // Keeps the sequence and round; any partial input of this round is dropped.
    case 'PAUSE':
      if (state.status !== 'presenting' && state.status !== 'awaitingInput') return state
      return { ...state, status: 'paused', inputIndex: 0, pausedFrom: state.status }

    // Paused during the presentation: replay the full sequence of the same round (no new color).
    // Paused during the player's turn: the sequence was already seen, so go straight back to input,
    // which prevents pausing just to watch the sequence again.
    case 'RESUME':
      if (state.status !== 'paused') return state
      if (state.pausedFrom === 'awaitingInput') {
        return { ...state, status: 'awaitingInput', inputIndex: 0, pausedFrom: null }
      }
      return {
        ...state,
        status: 'presenting',
        inputIndex: 0,
        presentationId: state.presentationId + 1,
        pausedFrom: null,
      }
  }
}
