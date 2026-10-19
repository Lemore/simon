// Shared pacing constants. They are the same for every round (no speed-up).
export const LEAD_IN_MS = 700 // pause before the first color of a presentation
export const LIGHT_MS = 600 // how long each color stays lit (and sounds) during playback
export const GAP_MS = 250 // pause between colors during playback
export const PRESS_FEEDBACK_MS = 250 // highlight + tone length when the player taps a pad
export const END_SOUND_DELAY_MS = 300 // delay before the win/loss sound, so it doesn't clash with the last tap
