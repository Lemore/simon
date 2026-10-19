import { BOARD_COLORS, type SimonColor } from './colors.ts'

// Plain game randomness (not cryptographic). Repeats are allowed.
export function randomColor(random: () => number = Math.random): SimonColor {
  const index = Math.min(Math.floor(random() * BOARD_COLORS.length), BOARD_COLORS.length - 1)
  return BOARD_COLORS[index].id
}
