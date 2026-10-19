import { useEffect, useState } from 'react'
import BottomNav, { type Screen } from './components/BottomNav.tsx'
import { useGame } from './game/useGame.ts'
import { useHistory } from './history/useHistory.ts'
import UpdatePrompt from './pwa/UpdatePrompt.tsx'
import AboutScreen from './screens/AboutScreen.tsx'
import HomeScreen from './screens/HomeScreen.tsx'

// App stays mounted for the whole session and owns the game state,
// so switching screens never resets an active game.
export default function App() {
  const [screen, setScreen] = useState<Screen>('home')
  const { state, litColor, audioError, start, pause, resume, reset, pressPad } = useGame()
  const history = useHistory()
  const { saveResult } = history

  // A finished game is recorded once (useHistory ignores a gameId it already saved).
  useEffect(() => {
    if (state.status !== 'won' && state.status !== 'lost') return
    saveResult(state.gameId, state.status === 'won' ? 'win' : 'loss', state.completedRounds)
  }, [state.status, state.gameId, state.completedRounds, saveResult])

  // Leaving the home screen pauses an active game; returning never resumes it by itself.
  const changeScreen = (next: Screen) => {
    if (next !== 'home') pause()
    setScreen(next)
  }

  return (
    <div className="app">
      <main className="app-content">
        {screen === 'home' ? (
          <HomeScreen
            game={state}
            litColor={litColor}
            audioError={audioError}
            onStart={() => void start()}
            onResume={() => void resume()}
            onPlayAgain={reset}
            onPadPress={pressPad}
          />
        ) : (
          <AboutScreen
            results={history.results}
            loadFailed={history.loadFailed}
            saveFailed={history.saveFailed}
            deleteFailed={history.deleteFailed}
            onClear={history.clear}
          />
        )}
      </main>
      <UpdatePrompt
        gameActive={
          state.status === 'presenting' || state.status === 'awaitingInput' || state.status === 'paused'
        }
      />
      <BottomNav active={screen} onChange={changeScreen} />
    </div>
  )
}
