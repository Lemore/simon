import PrimaryButton from '../components/PrimaryButton.tsx'
import SimonBoard from '../components/SimonBoard.tsx'
import { FIRST_ROUND, TOTAL_ROUNDS } from '../game/colors.ts'
import './HomeScreen.css'

export default function HomeScreen() {
  return (
    <section className="home-screen">
      <header className="home-screen__header">
        <h1 className="brand-title">סיימון</h1>
        <p className="stage-badge">
          <span className="stage-badge__dot" aria-hidden="true" />
          שלב {FIRST_ROUND} מתוך {TOTAL_ROUNDS}
        </p>
        {/* Reserved line for game status text, so the layout does not shift later. */}
        <p className="home-screen__status" aria-live="polite" />
      </header>

      <SimonBoard />

      <div className="home-screen__actions">
        <PrimaryButton>התחל</PrimaryButton>
      </div>
    </section>
  )
}
