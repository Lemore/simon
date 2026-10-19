import { TOTAL_ROUNDS } from '../game/colors.ts'

export type GameResult = {
  id: string
  finishedAt: string // ISO 8601
  completedRounds: number // 0–10
  outcome: 'win' | 'loss'
}

type HistoryData = {
  schemaVersion: 1
  results: GameResult[] // newest first, at most MAX_RESULTS
}

export const STORAGE_KEY = 'simon.history.v1'
export const MAX_RESULTS = 10

export type LoadResult = { ok: true; results: GameResult[] } | { ok: false; results: [] }
export type WriteResult = { ok: true; results: GameResult[] } | { ok: false }

function isGameResult(value: unknown): value is GameResult {
  if (typeof value !== 'object' || value === null) return false
  const r = value as Record<string, unknown>
  return (
    typeof r.id === 'string' &&
    typeof r.finishedAt === 'string' &&
    !Number.isNaN(Date.parse(r.finishedAt)) &&
    Number.isInteger(r.completedRounds) &&
    (r.completedRounds as number) >= 0 &&
    (r.completedRounds as number) <= TOTAL_ROUNDS &&
    (r.outcome === 'win' || r.outcome === 'loss')
  )
}

// Never throws: localStorage may be blocked (private mode, disabled site data) or hold corrupt JSON.
export function loadHistory(): LoadResult {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (raw === null) return { ok: true, results: [] }
    const data = JSON.parse(raw) as Partial<HistoryData> | null
    if (!data || data.schemaVersion !== 1 || !Array.isArray(data.results)) {
      return { ok: false, results: [] }
    }
    return { ok: true, results: data.results.filter(isGameResult).slice(0, MAX_RESULTS) }
  } catch {
    return { ok: false, results: [] }
  }
}

// Adds the newest result first and drops the oldest beyond the limit.
export function addResult(current: GameResult[], result: GameResult): WriteResult {
  const results = [result, ...current].slice(0, MAX_RESULTS)
  const data: HistoryData = { schemaVersion: 1, results }
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    return { ok: true, results }
  } catch {
    return { ok: false }
  }
}

export function clearHistory(): WriteResult {
  try {
    window.localStorage.removeItem(STORAGE_KEY)
    return { ok: true, results: [] }
  } catch {
    return { ok: false }
  }
}
