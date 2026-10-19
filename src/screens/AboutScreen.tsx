import { useCallback, useState } from 'react'
import ConfirmDialog from '../components/ConfirmDialog.tsx'
import { TOTAL_ROUNDS } from '../game/colors.ts'
import type { GameResult } from '../history/historyRepository.ts'
import './AboutScreen.css'

type AboutScreenProps = {
  results: GameResult[]
  loadFailed: boolean
  saveFailed: boolean
  deleteFailed: boolean
  onClear: () => void
}

// Local date and time of the device, e.g. 12.05.2026 14:32.
const dateFormat = new Intl.DateTimeFormat('he-IL', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
})
const timeFormat = new Intl.DateTimeFormat('he-IL', { hour: '2-digit', minute: '2-digit', hour12: false })

function HistoryCard({ result }: { result: GameResult }) {
  const finishedAt = new Date(result.finishedAt)
  const won = result.outcome === 'win'
  return (
    <li className="card history-card">
      <div className="history-card__main">
        <p>שלבים שהושלמו: {result.completedRounds}</p>
        <p className={`history-card__outcome history-card__outcome--${result.outcome}`}>
          תוצאה: {won ? 'ניצחון' : 'הפסד'}
        </p>
      </div>
      <time className="history-card__time" dateTime={result.finishedAt}>
        {dateFormat.format(finishedAt)} {timeFormat.format(finishedAt)}
      </time>
    </li>
  )
}

export default function AboutScreen({ results, loadFailed, saveFailed, deleteFailed, onClear }: AboutScreenProps) {
  const [confirming, setConfirming] = useState(false)
  const closeDialog = useCallback(() => setConfirming(false), [])

  const errors = [
    loadFailed && 'לא ניתן לטעון את היסטוריית המשחקים במכשיר זה.',
    saveFailed && 'לא ניתן היה לשמור את תוצאת המשחק האחרון.',
    deleteFailed && 'מחיקת ההיסטוריה נכשלה. נסה שוב.',
  ].filter(Boolean)

  return (
    <section className="about-screen">
      <h1 className="about-screen__title">אודות</h1>

      <article className="card">
        <h2 className="card__title">על המשחק</h2>
        <p>זכור את רצף הצבעים שמוצג.</p>
        <p>לחץ על הצבעים באותו סדר.</p>
        <p>נסה להגיע עד שלב {TOTAL_ROUNDS}!</p>
      </article>

      <section className="about-screen__history" aria-labelledby="history-title">
        <h2 id="history-title" className="about-screen__subtitle">
          {TOTAL_ROUNDS} המשחקים האחרונים
        </h2>

        {errors.map((message) => (
          <p key={message as string} className="about-screen__error" role="alert">
            {message}
          </p>
        ))}

        {results.length === 0 ? (
          <p className="card card--empty">עדיין אין משחקים שמורים</p>
        ) : (
          <>
            <ol className="history-list" aria-labelledby="history-title">
              {results.map((result) => (
                <HistoryCard key={result.id} result={result} />
              ))}
            </ol>
            <button type="button" className="about-screen__delete" onClick={() => setConfirming(true)}>
              מחק היסטוריה
            </button>
          </>
        )}
      </section>

      {confirming && (
        <ConfirmDialog
          title="למחוק את ההיסטוריה?"
          description="כל תוצאות המשחקים השמורות יימחקו."
          confirmLabel="מחק"
          cancelLabel="ביטול"
          onCancel={closeDialog}
          onConfirm={() => {
            onClear()
            closeDialog()
          }}
        />
      )}
    </section>
  )
}
