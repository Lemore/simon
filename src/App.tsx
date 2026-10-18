import { useState } from 'react'
import BottomNav, { type Screen } from './components/BottomNav.tsx'
import AboutScreen from './screens/AboutScreen.tsx'
import HomeScreen from './screens/HomeScreen.tsx'

// App stays mounted for the whole session, so it will own the game state
// and switching screens never resets an active game.
export default function App() {
  const [screen, setScreen] = useState<Screen>('home')

  return (
    <div className="app">
      <main className="app-content">
        {screen === 'home' ? <HomeScreen /> : <AboutScreen />}
      </main>
      <BottomNav active={screen} onChange={setScreen} />
    </div>
  )
}
