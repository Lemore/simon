import { BOARD_COLORS } from '../game/colors.ts'
import './SimonBoard.css'

export default function SimonBoard() {
  return (
    // Board positions are spatial, so the grid is forced to LTR.
    <div className="simon-board" dir="ltr" role="group" aria-label="לוח המשחק">
      {BOARD_COLORS.map((color) => (
        <button
          key={color.id}
          type="button"
          className={`simon-board__pad simon-board__pad--${color.id}`}
          aria-label={color.label}
        />
      ))}
      <div className="simon-board__center" aria-hidden="true" />
    </div>
  )
}
