import { useState } from 'react'
import BottomNav, { type Screen } from './components/BottomNav.tsx'
import { useGame } from './game/useGame.ts'
import AboutScreen from './screens/AboutScreen.tsx'
import HomeScreen from './screens/HomeScreen.tsx'

// App stays mounted for the whole session and owns the game state,
// so switching screens never resets an active game.
export default function App() {
  const [screen, setScreen] = useState<Screen>('home')
  const { state, litColor, audioError, start, pressPad } = useGame()

  return (
    <div className="app">
      <main className="app-content">
        {screen === 'home' ? (
          <HomeScreen
            game={state}
            litColor={litColor}
            audioError={audioError}
            onStart={() => void start()}
            onPadPress={pressPad}
          />
        ) : (
          <AboutScreen />
        )}
      </main>
      <BottomNav active={screen} onChange={setScreen} />
    </div>
  )
}
