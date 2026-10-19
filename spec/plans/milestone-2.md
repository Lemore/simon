# תוכנית – Milestone 2: משחק מלא מקצה לקצה

> מקורות: `PRD.md` (4.2, Edge Cases), `ARCHITECTURE.md` (2.3, 2.4, 2.5, 2.6, 2.10), `DESIGN.md` (1.1, 2.3–2.4), `MILESTONES.md` (Milestone 2), Wireframes/Mockups (מצבי "הצגת רצף", "התור שלך", "ניצחון", "הפסד").
> נקודת מוצא: הקוד של Milestone 1 – `App.tsx` מחזיק את בחירת המסך, `HomeScreen` סטטי, `SimonBoard` מציג ארבעה כפתורים ללא התנהגות, ומחלקות `is-lit` / `is-dimmed` כבר קיימות ב-CSS.

## 1. מטרה ותחום

לחבר לוגיקת משחק אמיתית למסך הבית: התחלה, הצגת רצף עם הארה וצליל, שחזור, התקדמות עד שלב 10, ניצחון (עם קונפטי) והפסד, ו-"שחק שוב".

**בתחום:** מצבים `idle`, `presenting`, `awaitingInput`, `won`, `lost`; Web Audio; קונפטי; טיפול בכשל הפעלת אודיו; בדיקות.

**מחוץ לתחום (Milestones הבאים):**
- מצב `paused`, כפתור "המשך משחק", `visibilitychange` / `pagehide` – Milestone 3. עד אז, מעבר לאודות באמצע משחק אינו מוגדר עדיין: המשחק פשוט ממשיך ברקע (לא נבנה לכך טיפול מיוחד בשלב הזה).
- שמירת תוצאה להיסטוריה ו-`localStorage` – Milestone 4. ב-M2 **אין** כתיבה לאחסון כלשהו.
- PWA – Milestone 5.

## 2. קבצים

### חדשים
| קובץ | תפקיד |
|---|---|
| `src/game/gameReducer.ts` | State, Actions ו-Reducer טהור (ללא Side Effects) |
| `src/game/sequence.ts` | `randomColor(random?)` ו-`extendSequence(seq, random?)` – בחירה ב-`Math.random()` עם אפשרות הזרקה לבדיקות |
| `src/game/timing.ts` | קבועי קצב משותפים לכל השלבים |
| `src/game/playback.ts` | Sequence Controller: הרצת הרצף לפי Timers עם `AbortSignal` |
| `src/game/useGame.ts` | Hook שמחבר Reducer + Playback + Audio + קונפטי, ונקרא מ-`App` |
| `src/audio/audioEngine.ts` | ניהול `AudioContext`, צליל לכל צבע, צלילי ניצחון/הפסד, עצירה |
| `src/components/GameOverDialog.tsx` + `.css` | Overlay הסיום (ניצחון/הפסד) עם "שחק שוב" |
| `src/game/gameReducer.test.ts` | בדיקות יחידה ל-Reducer ולרצף |
| `src/game/playback.test.ts` | בדיקות Playback עם Fake Timers וביטול |
| `src/screens/HomeScreen.test.tsx` | בדיקות אינטגרציה של משחק מלא דרך הממשק |

### קיימים שישתנו
| קובץ | שינוי |
|---|---|
| `src/App.tsx` | קורא ל-`useGame()` ומעביר את המצב והפעולות ל-`HomeScreen` (המצב נשאר ב-App שלא מתפרק במעבר מסכים – מכין את M3) |
| `src/screens/HomeScreen.tsx` / `.css` | חיווי שלב דינמי, טקסט סטטוס לפי מצב, כפתור לפי מצב, הצגת `GameOverDialog`, הודעת כשל אודיו |
| `src/components/SimonBoard.tsx` / `.css` | Props: `litColor`, `dimmed`, `inputEnabled`, `onPadPress`; שימוש ב-`is-lit` / `is-dimmed`; צבע Glow לפי צבע הרבע |
| `src/App.test.tsx` | עדכון קל אם נדרש (הבדיקות הקיימות צריכות להמשיך לעבור) |
| `package.json` | תלות `canvas-confetti` ו-`@types/canvas-confetti` (dev) |
| `spec/ARCHITECTURE.md` | ADR-2 על ערכי הקצב והצלילים שנקבעו (ראו סעיף 9) |
| `spec/MILESTONES.md` | סימון 🟡 בסיום הבנייה |

## 3. Game Engine – Reducer

```ts
type GameStatus = 'idle' | 'presenting' | 'awaitingInput' | 'won' | 'lost'

type GameState = {
  status: GameStatus
  sequence: SimonColor[]   // length 0 in idle, 1–10 otherwise
  round: number            // 1–10 (1 in idle, for the "שלב 1 מתוך 10" label)
  inputIndex: number
  completedRounds: number  // 0–10
  gameId: number           // increments on every new game; used later to guard single history write
}

type GameAction =
  | { type: 'START'; firstColor: SimonColor }        // from idle / won / lost
  | { type: 'PRESENTATION_DONE'; gameId: number }    // from presenting only
  | { type: 'PRESS'; color: SimonColor; nextColor: SimonColor } // from awaitingInput only
```

כללים:
- **אקראיות מחוץ ל-Reducer:** הצבע החדש נבחר ב-Hook ומועבר ב-Action (`firstColor` / `nextColor`), כך שה-Reducer נשאר טהור ודטרמיניסטי לבדיקות. `nextColor` מתעלמים ממנו אם הלחיצה אינה משלימה שלב.
- `START` → `sequence=[firstColor]`, `round=1`, `inputIndex=0`, `completedRounds=0`, `gameId+1`, `status='presenting'`. משמש גם את "התחל" וגם את "שחק שוב" (רצף חדש לגמרי).
- `PRESENTATION_DONE` → `awaitingInput`, `inputIndex=0`. מתעלם אם `gameId` לא תואם או שהמצב אינו `presenting` (הגנה מ-Callback מיושן).
- `PRESS` בכל מצב שאינו `awaitingInput` → מחזיר את אותו state ללא שינוי.
- `PRESS` שגוי → `lost`, `completedRounds = round - 1` (0 בשלב 1).
- `PRESS` נכון שאינו אחרון → `inputIndex+1`.
- `PRESS` נכון ואחרון → `completedRounds = round`; אם `round === 10` → `won` (10); אחרת `round+1`, `sequence=[...sequence, nextColor]`, `status='presenting'`. אין דרך להגיע לשלב 11.
- `TOTAL_ROUNDS` ו-`SimonColor` נלקחים מ-`src/game/colors.ts` הקיים.

## 4. קצב (Timing)

קבועים ב-`src/game/timing.ts`, זהים לכל השלבים (ללא האצה):

| קבוע | ערך | משמעות |
|---|---|---|
| `LEAD_IN_MS` | 700 | השהייה לפני הצבע הראשון (גם בין סוף שלב לתחילת הצגת הבא) |
| `LIGHT_MS` | 600 | משך הארה + צליל של כל צבע |
| `GAP_MS` | 250 | הפסקה בין צבעים |
| `PRESS_FEEDBACK_MS` | 250 | משך הארה + צליל בלחיצת שחקן |
| `END_SOUND_DELAY_MS` | 300 | השהייה קצרה לפני צליל הסיום, כדי שלא יתנגש בצליל הלחיצה |

הערכים נקבעים במימוש (PRD/ARCHITECTURE השאירו זאת פתוח) ויתועדו ב-ADR-2.

## 5. Sequence Controller – `playback.ts`

```ts
playSequence(sequence, { onLight, onDone, signal }): void
```
- עובר על הרצף: `LEAD_IN_MS` → לכל צבע: `onLight(color)` + `audio.playTone(color, LIGHT_MS)` → אחרי `LIGHT_MS` `onLight(null)` → `GAP_MS` → הבא. בסוף `onDone()`.
- כל Timer נרשם ומבוטל ב-`signal.abort`; לאחר ביטול אין קריאה ל-`onLight`/`onDone`, ומתבצע `audio.stopAll()` ו-`onLight(null)`.
- ב-`useGame`: Effect שתלוי ב-`status === 'presenting'` וב-`gameId` + `round`, יוצר `AbortController`, ומבטל ב-Cleanup (מכסה גם את הרצה הכפולה של Effects ב-React Strict Mode). `onDone` שולח `PRESENTATION_DONE` עם ה-`gameId` הנוכחי.

## 6. Audio Engine – `audioEngine.ts`

- `unlockAudio(): Promise<boolean>` – יוצר `AudioContext` (פעם אחת) או קורא ל-`resume()`. נקרא **בתוך** ה-click handler של "התחל" / "שחק שוב" לפני `START`. מחזיר `false` אם אין תמיכה, אם `resume()` נכשל, או אם ה-`state` לא הפך ל-`running`.
- `playTone(color, durationMs)` – Oscillator (`triangle`) + `GainNode` עם Attack/Release קצרים (~10ms / ~30ms) למניעת קליקים. גבהים שונים לכל צבע (בהשראת Simon המקורי): ירוק 415Hz, אדום 310Hz, צהוב 252Hz, כחול 209Hz.
- `playWinSound()` – ארפג'יו עולה קצר (4 תווים). `playLossSound()` – צליל נמוך יורד (`sawtooth`, ~0.6 שנ'). שני מוטיבים נבדלים.
- `stopAll()` – עוצר את כל ה-Oscillators הפעילים (רשימה פנימית).
- **כשל אודיו:** אם `unlockAudio()` מחזיר `false` – לא שולחים `START`, המשחק נשאר במצבו (idle / סיום), ומוצגת הודעה בעברית באזור הסטטוס: **"לא ניתן להפעיל את הצלילים. נסה ללחוץ שוב."** הלחיצה הבאה מנסה שוב (מתוך Gesture). אין הצגת רצף שקט.
- בבדיקות (jsdom אין `AudioContext`) – המודול ממוקם (`vi.mock`), כולל בדיקה ייעודית למסלול הכשל.

## 7. Hook – `useGame.ts`

מחזיר: `state`, `litColor`, `audioError`, `start()`, `pressPad(color)`.
- `start()` – async: `unlockAudio()` → אם הצליח: `dispatch({ type: 'START', firstColor: randomColor() })`, איפוס `audioError`; אחרת `audioError=true`.
- `pressPad(color)` – פועל רק ב-`awaitingInput`: מציג הארה (`litColor`) + `playTone` למשך `PRESS_FEEDBACK_MS` (Timer ניתן לביטול), ושולח `PRESS` עם `nextColor: randomColor()`.
- Effect על מעבר ל-`won` / `lost`: אחרי `END_SOUND_DELAY_MS` צליל סיום מתאים. ב-`won` בלבד – `confetti(...)` מ-`canvas-confetti` (פעם אחת לכל `gameId`); ב-Cleanup / יציאה מהמצב – `confetti.reset()`. עם `prefers-reduced-motion: reduce` – קונפטי מצומצם (פחות חלקיקים, ללא Burst חוזר), בלי לשנות חוקים.
- **אין** שימוש ב-`localStorage` / `sessionStorage`. רענון דף = State חדש ב-`idle` באופן טבעי.

## 8. ממשק – מסך הבית

| מצב | חיווי שלב | שורת סטטוס | לוח | פעולה |
|---|---|---|---|---|
| `idle` | "שלב 1 מתוך 10" | ריק (או הודעת כשל אודיו) | מלא, לחיצות חסומות | **"התחל"** |
| `presenting` | "שלב X מתוך 10" | **"המשחק מציג את הרצף"** | אחרים מעומעמים, הצבע הנוכחי `is-lit` עם Glow; חסום | ללא כפתור |
| `awaitingInput` | "שלב X מתוך 10" | **"התור שלך"** + הנחיה **"הקש על הצבעים לפי הסדר"** | מואר, לחיץ; לחיצה מאירה + צליל | ללא כפתור |
| `won` | "שלב 10 מתוך 10" | – | ברקע, חסום | Overlay: **"כל הכבוד! ניצחת!"**, "השלמת 10 שלבים", **"שחק שוב"** + קונפטי |
| `lost` | "שלב X מתוך 10" (השלב שבו נפסל) | – | ברקע, חסום | Overlay: **"נפסלת!"**, "השלמת N שלבים" (N=`completedRounds`), **"שחק שוב"**; ללא קונפטי |

פרטים:
- **חסימת קלט:** הכפתורים ב-`SimonBoard` מקבלים `disabled` כשהקלט אינו פעיל (מונע גם לחיצה וגם Focus), ו-`pressPad` בודק בנוסף את המצב, וה-Reducer מתעלם – שלוש שכבות הגנה. ב-`presenting` הלוח מעומעם חוץ מהצבע המואר; ב-`idle` הלוח מוצג מלא כמו היום.
- **Glow לפי צבע:** הוספת `color` לכל רבע ב-CSS כך ש-`currentColor` ב-`is-lit` יזרח בצבע הנכון.
- **GameOverDialog:** `role="dialog"`, `aria-modal="true"`, `aria-labelledby` לכותרת; כרטיס כהה מעוגל מעל הלוח עם Scrim, לפי Wireframe "ניצחון"/"הפסד" ובשפה החזותית של ה-Mockups (כרטיס כהה עם קו מתאר כחול). Focus עובר לכפתור "שחק שוב" עם הפתיחה. פס הניווט נשאר גלוי.
- טקסטי מספרים בתוך שורה עברית עם `unicode-bidi: isolate` כמו ה-badge הקיים. "השלמת 1 שלבים" → לנסח "השלמת שלב אחד" כשה-N=1, אחרת "השלמת N שלבים".
- שורת הסטטוס נשארת `aria-live="polite"`.

## 9. ADR

להוסיף ל-`ARCHITECTURE.md`:
- **ADR-2: ערכי קצב וצלילים** – ערכי הטבלה בסעיף 4, גבהי הצליל והמוטיבים מסעיף 6; הקשר: ה-PRD וה-Architecture השאירו אותם להחלטת מימוש.
- **ADR-3: בחירת צבע אקראי מחוץ ל-Reducer** – הצבע מועבר ב-Action כדי שה-Reducer יישאר טהור ובדיק.

## 10. בדיקות אוטומטיות

**`gameReducer.test.ts`**
- `START` יוצר רצף באורך 1, שלב 1, `completedRounds=0`; `START` שני מגדיל `gameId` ומאפס.
- שלבים 1, 2, 10: אורך הרצף 1, 2, 10; הרצף הקודם הוא Prefix של הבא; מותרות חזרות (הזרקת אותו צבע פעמיים).
- `PRESS` ב-`presenting` / `idle` / `won` / `lost` לא משנה State.
- טעות בשלב 1 → `lost`, 0. טעות באמצע שלב 5 (אחרי לחיצות נכונות) → `lost`, 4.
- השלמת שלב 10 → `won`, 10; אין שלב 11 ואין לחיצות נוספות אחרי ניצחון.
- `PRESENTATION_DONE` עם `gameId` ישן מתעלם.

**`playback.test.ts`** (Fake Timers, אודיו ממוקם)
- `onLight` נקרא בסדר הרצף, `onDone` פעם אחת בסוף; משך כולל זהה לכל צבע (קצב קבוע) בין רצף קצר לארוך.
- `abort()` באמצע: אין קריאות נוספות, `stopAll` נקרא, ההארה כבויה.

**`HomeScreen.test.tsx`** (אינטגרציה דרך `App`, Fake Timers, `audioEngine` ו-`canvas-confetti` ממוקמים, `Math.random` נשלט)
- "התחל" → "המשחק מציג את הרצף", לחיצה על רבע בזמן ההצגה לא עושה דבר → אחרי ההצגה "התור שלך".
- הפסד בשלב 1 → "נפסלת!" + 0 שלבים, צליל הפסד, קונפטי **לא** נקרא.
- הפסד בשלב מתקדם → מספר השלבים הנכון.
- משחק שלם עד ניצחון → "כל הכבוד! ניצחת!", צליל ניצחון, קונפטי נקרא פעם אחת.
- "שחק שוב" → שלב 1, רצף חדש באורך 1 (צבע אחר לפי ה-random הממוקם).
- כשל `unlockAudio` → הודעת השגיאה מוצגת, המשחק לא התחיל ("התחל" עדיין זמין), לחיצה נוספת מצליחה.
- ארבעת הצבעים קוראים ל-`playTone` עם צבע שונה בלחיצה.
- אין קריאות ל-`localStorage.setItem` במהלך משחק.

ובנוסף: `npm run typecheck`, `npm run test`, `npm run build` עוברים.

## 11. בדיקה ידנית (בבנייה, בדפדפן עם אמולציית מובייל)

- משחק עד הפסד ועד ניצחון (לבדיקה מהירה של ניצחון – רק בבדיקה האוטומטית; ידנית לפחות כמה שלבים).
- שמיעת ארבעה צלילים שונים וצלילי סיום, הארה בולטת בכל רבע.
- קצב ההצגה זהה בשלב 1 ובשלב מתקדם.
- רענון באמצע משחק → חזרה ל-"שלב 1 מתוך 10" ו-"התחל".
- ללא גלילה אופקית, ה-Overlay קריא ב-Viewport טלפון אנכי.
- **מגבלה ידועה:** צליל במכשיר אמיתי (מצב שקט/נעילה) לא ייבדק ב-M2; ייבדק בפריסה ב-M5. בדיקת אודיו כאן – בדפדפן דסקטופ באמולציה.

## 12. מיפוי ל-Definition of Done

| תנאי | מכוסה ע"י |
|---|---|
| התחלה ב-"התחל"; אורכים 1/2/10; Prefix | Reducer + בדיקות סעיף 10 |
| צלילים שונים והארה נבדלת; קצב קבוע | Audio Engine, `timing.ts`, `playback.test.ts`, בדיקה ידנית |
| חסימה ב-`presenting`; התקדמות; טעות אחת = הפסד | Reducer + `disabled` + בדיקות |
| הפסד שלב 1, הפסד מתקדם, ניצחון, אין שלב 11, "שחק שוב" | בדיקות Reducer ואינטגרציה |
| טקסט + צליל סיום; קונפטי בניצחון בלבד | `GameOverDialog`, Effect הסיום, בדיקות אינטגרציה |
| Refresh מאפס; אין שמירה מתמידה | State בזיכרון בלבד + בדיקת `localStorage` + בדיקה ידנית |
