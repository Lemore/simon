import PrimaryButton from './PrimaryButton.tsx'
import './GameOverDialog.css'

type GameOverDialogProps = {
  outcome: 'won' | 'lost'
  completedRounds: number
  onPlayAgain: () => void
}

function completedText(count: number) {
  return count === 1 ? 'השלמת שלב אחד' : `השלמת ${count} שלבים`
}

export default function GameOverDialog({ outcome, completedRounds, onPlayAgain }: GameOverDialogProps) {
  const won = outcome === 'won'
  return (
    <div className="game-over">
      <div
        className={`game-over__card game-over__card--${outcome}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="game-over-title"
        aria-describedby="game-over-details"
      >
        <h2 id="game-over-title" className="game-over__title">
          {won ? 'כל הכבוד! ניצחת!' : 'נפסלת!'}
        </h2>
        <p id="game-over-details" className="game-over__details">
          {completedText(completedRounds)}
        </p>
        <PrimaryButton autoFocus onClick={onPlayAgain}>
          שחק שוב
        </PrimaryButton>
      </div>
    </div>
  )
}
