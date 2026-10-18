import { TOTAL_ROUNDS } from '../game/colors.ts'
import './AboutScreen.css'

export default function AboutScreen() {
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
        <p className="card card--empty">עדיין אין משחקים שמורים</p>
      </section>
    </section>
  )
}
