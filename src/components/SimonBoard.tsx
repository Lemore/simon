import { BOARD_COLORS, type SimonColor } from '../game/colors.ts'
import './SimonBoard.css'

type SimonBoardProps = {
  litColor?: SimonColor | null
  // Dim every pad except the lit one (used while the sequence is presented).
  dimmed?: boolean
  inputEnabled?: boolean
  onPadPress?: (color: SimonColor) => void
}

export default function SimonBoard({
  litColor = null,
  dimmed = false,
  inputEnabled = false,
  onPadPress,
}: SimonBoardProps) {
  return (
    // Board positions are spatial, so the grid is forced to LTR.
    <div className="simon-board" dir="ltr" role="group" aria-label="לוח המשחק">
      {BOARD_COLORS.map((color) => {
        const lit = litColor === color.id
        const classes = [
          'simon-board__pad',
          `simon-board__pad--${color.id}`,
          lit && 'is-lit',
          dimmed && !lit && 'is-dimmed',
        ]
        return (
          <button
            key={color.id}
            type="button"
            className={classes.filter(Boolean).join(' ')}
            aria-label={color.label}
            disabled={!inputEnabled}
            onClick={() => onPadPress?.(color.id)}
          />
        )
      })}
      <div className="simon-board__center" aria-hidden="true" />
    </div>
  )
}
