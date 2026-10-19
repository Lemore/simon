import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  addResult,
  clearHistory,
  loadHistory,
  MAX_RESULTS,
  STORAGE_KEY,
  type GameResult,
} from './historyRepository.ts'

const result = (n: number, overrides: Partial<GameResult> = {}): GameResult => ({
  id: `r${n}`,
  finishedAt: new Date(2026, 9, n, 12, 0).toISOString(),
  completedRounds: n % 11,
  outcome: n % 2 ? 'loss' : 'win',
  ...overrides,
})

const stored = () => JSON.parse(window.localStorage.getItem(STORAGE_KEY)!)

describe('historyRepository', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('loads an empty list when nothing was saved', () => {
    expect(loadHistory()).toEqual({ ok: true, results: [] })
  })

  it('adds the newest result first and persists it', () => {
    const first = addResult([], result(1))
    expect(first.ok).toBe(true)
    const second = addResult(first.ok ? first.results : [], result(2))
    expect(second).toEqual({ ok: true, results: [result(2), result(1)] })
    expect(stored()).toEqual({ schemaVersion: 1, results: [result(2), result(1)] })
    expect(loadHistory()).toEqual({ ok: true, results: [result(2), result(1)] })
  })

  it('keeps at most 10 results, dropping the oldest', () => {
    let results: GameResult[] = []
    for (let n = 1; n <= 11; n++) {
      const write = addResult(results, result(n))
      if (write.ok) results = write.results
    }
    expect(results).toHaveLength(MAX_RESULTS)
    expect(results.map((r) => r.id)).toEqual(['r11', 'r10', 'r9', 'r8', 'r7', 'r6', 'r5', 'r4', 'r3', 'r2'])
    expect(loadHistory().results).toEqual(results)
  })

  it('reports corrupt or unknown data without throwing', () => {
    window.localStorage.setItem(STORAGE_KEY, '{not json')
    expect(loadHistory()).toEqual({ ok: false, results: [] })

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ schemaVersion: 2, results: [] }))
    expect(loadHistory()).toEqual({ ok: false, results: [] })

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ schemaVersion: 1, results: 'x' }))
    expect(loadHistory()).toEqual({ ok: false, results: [] })
  })

  it('drops invalid entries and keeps valid ones', () => {
    const data = {
      schemaVersion: 1,
      results: [
        result(1),
        { ...result(2), completedRounds: 11 },
        { ...result(3), outcome: 'draw' },
        { ...result(4), finishedAt: 'yesterday' },
        { id: 'r5' },
        null,
        result(6),
      ],
    }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    expect(loadHistory()).toEqual({ ok: true, results: [result(1), result(6)] })
  })

  it('clears the saved results', () => {
    addResult([], result(1))
    expect(clearHistory()).toEqual({ ok: true, results: [] })
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull()
  })

  it('reports storage failures instead of throwing', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError')
    })
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new Error('SecurityError')
    })
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError')
    })
    expect(addResult([], result(1))).toEqual({ ok: false })
    expect(clearHistory()).toEqual({ ok: false })
    expect(loadHistory()).toEqual({ ok: false, results: [] })
  })

  it('handles localStorage itself being inaccessible', () => {
    vi.spyOn(window, 'localStorage', 'get').mockImplementation(() => {
      throw new Error('SecurityError')
    })
    expect(loadHistory()).toEqual({ ok: false, results: [] })
    expect(addResult([], result(1))).toEqual({ ok: false })
    expect(clearHistory()).toEqual({ ok: false })
  })
})
