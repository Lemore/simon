import { useCallback, useRef, useState } from 'react'
import { addResult, clearHistory, loadHistory, type GameResult } from './historyRepository.ts'

// Keeps the saved results in memory and mirrors every change to localStorage.
export function useHistory() {
  const [initial] = useState(loadHistory)
  const [results, setResults] = useState<GameResult[]>(initial.results)
  const [loadFailed] = useState(!initial.ok)
  const [saveFailed, setSaveFailed] = useState(false)
  const [deleteFailed, setDeleteFailed] = useState(false)
  // Latest results, so a save never works from a stale list.
  const resultsRef = useRef(results)
  // A finished game stays won/lost while screens change and Strict Mode re-runs effects;
  // remembering its id makes sure it is saved only once.
  const savedGameId = useRef<number | null>(null)

  const saveResult = useCallback((gameId: number, outcome: GameResult['outcome'], completedRounds: number) => {
    if (savedGameId.current === gameId) return
    savedGameId.current = gameId
    const result: GameResult = {
      id: `${Date.now()}-${gameId}`,
      finishedAt: new Date().toISOString(),
      completedRounds,
      outcome,
    }
    const write = addResult(resultsRef.current, result)
    setSaveFailed(!write.ok)
    if (write.ok) {
      resultsRef.current = write.results
      setResults(write.results)
    }
  }, [])

  const clear = useCallback(() => {
    const write = clearHistory()
    setDeleteFailed(!write.ok)
    if (write.ok) {
      resultsRef.current = []
      setResults([])
      setSaveFailed(false)
    }
  }, [])

  return { results, loadFailed, saveFailed, deleteFailed, saveResult, clear }
}
