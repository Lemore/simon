export type SimonColor = 'green' | 'red' | 'yellow' | 'blue'

export type ColorInfo = {
  id: SimonColor
  label: string
}

// Ordered by board position (spatial, not affected by RTL):
// top-left, top-right, bottom-left, bottom-right.
export const BOARD_COLORS: readonly ColorInfo[] = [
  { id: 'green', label: 'ירוק' },
  { id: 'red', label: 'אדום' },
  { id: 'yellow', label: 'צהוב' },
  { id: 'blue', label: 'כחול' },
]

export const TOTAL_ROUNDS = 10

// The game always starts at round 1; it is also shown before the first game starts.
export const FIRST_ROUND = 1
