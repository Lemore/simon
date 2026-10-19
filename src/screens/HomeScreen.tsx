import GameOverDialog from '../components/GameOverDialog.tsx'
import PrimaryButton from '../components/PrimaryButton.tsx'
import SimonBoard from '../components/SimonBoard.tsx'
import { TOTAL_ROUNDS, type SimonColor } from '../game/colors.ts'
import type { GameState } from '../game/gameReducer.ts'
import './HomeScreen.css'

type HomeScreenProps = {
  game: GameState
  litColor: SimonColor | null
  audioError: boolean
  onStart: () => void
  onResume: () => void
  onPlayAgain: () => void
  onPadPress: (color: SimonColor) => void
}

const AUDIO_ERROR_TEXT = 'לא ניתן להפעיל את הצלילים. נסה ללחוץ שוב.'

export default function HomeScreen({ game, litColor, audioError, onStart, onResume, onPlayAgain, onPadPress }: HomeScreenProps) {
  const { status } = game
  const gameOver = status === 'won' || status === 'lost'

  let statusText = ''
  let hintText = ''
  if (audioError) {
    statusText = AUDIO_ERROR_TEXT
  } else if (status === 'presenting') {
    statusText = 'המשחק מציג את הרצף'
  } else if (status === 'paused') {
    statusText = 'המשחק מושהה'
  } else if (status === 'awaitingInput') {
    statusText = 'התור שלך'
    hintText = 'הקש על הצבעים לפי הסדר'
  }

  return (
    <section className="home-screen">
      <header className="home-screen__header">
        <h1 className="brand-title">סיימון</h1>
        <p className="stage-badge">
          <span className="stage-badge__dot" aria-hidden="true" />
          שלב {game.round} מתוך {TOTAL_ROUNDS}
        </p>
        <p
          className={`home-screen__status${audioError ? ' home-screen__status--error' : ''}`}
          aria-live="polite"
        >
          {statusText}
        </p>
      </header>

      <SimonBoard
        litColor={litColor}
        dimmed={status === 'presenting' || status === 'paused'}
        inputEnabled={status === 'awaitingInput'}
        onPadPress={onPadPress}
      />

      <div className="home-screen__actions">
        {status === 'idle' && <PrimaryButton onClick={onStart}>התחל</PrimaryButton>}
        {status === 'paused' && <PrimaryButton onClick={onResume}>המשך משחק</PrimaryButton>}
        {status === 'awaitingInput' && <p className="home-screen__hint">{hintText}</p>}
      </div>

      {gameOver && (
        <GameOverDialog
          key={game.gameId}
          outcome={status}
          completedRounds={game.completedRounds}
          onPlayAgain={onPlayAgain}
        />
      )}
    </section>
  )
}
