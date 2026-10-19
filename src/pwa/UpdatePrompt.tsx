import { useRegisterSW } from 'virtual:pwa-register/react'
import './UpdatePrompt.css'

type Props = {
  // True while a game is presenting, awaiting input or paused.
  gameActive: boolean
}

// Offers a waiting new version only when no game is active; the page reloads
// only after the player taps "עדכן", so an active game is never interrupted (ADR-8).
export default function UpdatePrompt({ gameActive }: Props) {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    // Unsupported browsers keep working as a regular website.
    onRegisterError: () => {},
  })

  if (!needRefresh || gameActive) return null

  return (
    <div className="update-prompt" role="status">
      <span className="update-prompt__text">גרסה חדשה זמינה</span>
      <div className="update-prompt__actions">
        <button
          type="button"
          className="update-prompt__button update-prompt__button--primary"
          onClick={() => void updateServiceWorker(true)}
        >
          עדכן
        </button>
        <button type="button" className="update-prompt__button" onClick={() => setNeedRefresh(false)}>
          לא עכשיו
        </button>
      </div>
    </div>
  )
}
