# תוכנית – Milestone 1: בסיס אפליקציה ושני מסכים מעוצבים

> מקורות: `PRD.md`, `ARCHITECTURE.md`, `DESIGN.md` (כולל `wireframes.png`, `mockups.png`, `style-guide.png`), `MILESTONES.md`.
> מצב נוכחי: אין עדיין קוד בפרויקט; קיים Git repo מקומי המחובר ל-`https://github.com/Lemore/simon.git`. Node 24 ו-npm 11 מותקנים.

## 1. מטרה

פרויקט React + TypeScript + Vite שרץ מקומית, עם שני מסכים (**בית**, **אודות**) בעיצוב הכהה של ה-Mockups, ניווט תחתון ביניהם בלי רענון דף, ובדיקות בסיסיות. **אין לוגיקת משחק** — הלוח וכפתור "התחל" מוצגים בלבד.

## 2. הקמת הפרויקט

1. ליצור תבנית Vite בתיקייה זמנית (Scratchpad) עם `npm create vite@latest -- --template react-ts`, ולהעתיק לשורש הפרויקט את הקבצים הנחוצים (התיקייה הנוכחית אינה ריקה, ולכן לא יוצרים ישירות בתוכה).
2. **לא** להעתיק את `.gitignore` של התבנית — הקיים כבר מכסה `node_modules/` ו-`dist/`. לא להעתיק את קובצי הדמו (`react.svg`, `vite.svg`, `App.css` של הדמו, תוכן הדמו ב-`App.tsx`).
3. התקנת תלויות:
   - Runtime: `react`, `react-dom` (מהתבנית), `@fontsource/heebo` (פונט Heebo מקומי — ראה ADR בסעיף 7).
   - Dev: `vitest`, `jsdom`, `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`.
   - **לא** להתקין בשלב זה `canvas-confetti`, `vite-plugin-pwa` או ספרייה אחרת — שייכים ל-Milestones הבאים.
4. Scripts ב-`package.json`:
   - `dev` → `vite`
   - `build` → `tsc -b && vite build`
   - `typecheck` → `tsc -b`
   - `test` → `vitest run`
   - `lint` → נשאר מהתבנית (ESLint).
5. `vite.config.ts`: React plugin + הגדרת Vitest (`environment: 'jsdom'`, `setupFiles: './src/test/setup.ts'`, `globals: true`). **לא** להגדיר עדיין `base: '/simon/'` — זה נעשה ב-Milestone 5 יחד עם הפריסה.
6. לא נדרש `.env` — אין מפתחות או שירותים חיצוניים.

## 3. מבנה קבצים

```text
index.html                     lang="he" dir="rtl", viewport, theme-color, <title>סיימון</title>
public/favicon.svg             אייקון פשוט: עיגול בארבעת צבעי המשחק
src/
  main.tsx                     טעינת Heebo (400/600/700), global.css, רינדור <App/>
  App.tsx                      App Shell: state של המסך הפעיל ('home' | 'about') + BottomNav
  App.test.tsx                 בדיקות Render/Navigation
  game/colors.ts               הגדרת ארבעת הצבעים: id, שם בעברית, מיקום בלוח (ישמש גם ב-M2)
  components/
    SimonBoard.tsx / .css      לוח עגול עם 4 רבעים + דיסק מרכזי
    BottomNav.tsx / .css       פס ניווט תחתון "בית" / "אודות" עם אייקונים
    icons.tsx                  אייקוני SVG בתוך הקוד: בית, מידע (i)
    PrimaryButton.tsx / .css   כפתור כחול ראשי (ישמש ל"התחל", "המשך משחק", "שחק שוב")
  screens/
    HomeScreen.tsx / .css      כותרת, חיווי שלב, לוח, אזור סטטוס, כפתור "התחל"
    AboutScreen.tsx / .css     כותרת, כרטיס "על המשחק", כותרת היסטוריה + חיווי ריק
  styles/global.css            CSS Variables (צבעים, ריווח, טיפוגרפיה), reset, פריסת מובייל
  test/setup.ts                ייבוא @testing-library/jest-dom
```

## 4. App Shell וניווט

- `App` מחזיק `useState<'home' | 'about'>('home')` ומרנדר את המסך הפעיל, ובתחתית `BottomNav`. אין Router, אין שינוי URL ואין טעינת דף — רק החלפת תצוגה בתוך אותו React Tree (לפי ARCHITECTURE 2.1).
- `App` הוא בעל ה-State המרכזי ונשאר תמיד mounted; ב-Milestone 2–3 יתווסף אליו מצב המשחק, כך שמעבר מסכים לא יאפס אותו.
- `BottomNav`: שני כפתורי `button` עם אייקון + תווית בעברית; הכפתור הפעיל מקבל `aria-current="page"` ומראה בולט (רקע כחול, כמו ב-Style Guide – Navigation Tabs). סדר ב-RTL: **"בית" מימין, "אודות" משמאל** (כמו ב-Wireframes).

## 5. מסך בית

לפי ה-Wireframe "בית – התחלה", בשפה החזותית של ה-Mockups:

1. **כותרת מותג** "סיימון" (H1, 32px Bold, לבן עם Glow כחול עדין — בהשראת ה-Mockups; טקסט עברי בלבד, בלי "SIMON" באנגלית).
2. **חיווי שלב**: "שלב 0 מתוך 10" (H3, 20px Semibold) בסגנון Stage Badge מה-Style Guide. הנוסח ההתחלתי "שלב 0" לקוח מה-Wireframe.
3. **אזור סטטוס** מתחת לחיווי (שורת טקסט קבועה בגובה, ריקה במצב התחלה) — שמור כבר עכשיו כדי שב-M2 הטקסטים "המשחק מציג את הרצף" / "התור שלך" לא יזיזו את הפריסה.
4. **לוח Simon** (`SimonBoard`):
   - ריבוע ברוחב `min(86vw, 360px)` לערך, בצורת עיגול עם מסגרת Charcoal עבה וצל רך.
   - CSS Grid 2×2 עם רווח כהה בין הרבעים (פסי הפרדה). כל רבע מעוגל בפינה החיצונית שלו בלבד, כך שיחד יוצרים עיגול.
   - **מיקומים (לפי DESIGN.md):** ירוק למעלה-שמאל, אדום למעלה-ימין, צהוב למטה-שמאל, כחול למטה-ימין. הלוח מקבל `dir="ltr"` כדי שהמיקומים יהיו מרחביים ולא יתהפכו ב-RTL (DESIGN 2.5).
   - דיסק מרכזי עגול כהה במרכז (ללא טקסט — DESIGN 2.3: "אין בו פיצ'ר נוסף").
   - כל רבע הוא `<button>` עם `aria-label` בעברית ("ירוק", "אדום", "צהוב", "כחול"); בשלב זה ללא פעולה בלחיצה. מוגדרים כבר מחלקות CSS למצבים `lit` (Glow) ו-`dimmed` לשימוש ב-M2–M3, אך לא מופעלים.
   - `user-select: none`, `touch-action: manipulation`, `-webkit-tap-highlight-color: transparent` למניעת סימון טקסט ו-Double-tap zoom.
5. **כפתור "התחל"** (`PrimaryButton`): כחול מלא `#00A3FF`, רחב, מעוגל, טקסט לבן 16px Semibold, צל רך. בשלב זה אין לו פעולה.
6. ללא כפתור הגדרות, ללא מתג סאונד, ללא כפתור "היסטוריה" במסך הבית (מופיעים ב-Mockups אך לא ב-PRD/DESIGN).

## 6. מסך אודות

לפי ה-Wireframe "אודות":

1. כותרת "אודות" (H2).
2. כרטיס **"על המשחק"** עם הטקסט מה-Wireframe:
   "זכור את רצף הצבעים שמוצג. לחץ על הצבעים באותו סדר. נסה להגיע עד שלב 10!"
   (שלוש שורות, Body 16px).
3. כותרת **"10 המשחקים האחרונים"** ומתחתיה כרטיס חיווי ריק: **"עדיין אין משחקים שמורים"**.
4. **לא** מציגים עדיין כפתור "מחק היסטוריה" ולא רשימת תוצאות — שניהם שייכים ל-Milestone 4.
5. התוכן גולל אנכית אם צריך; פס הניווט נשאר קבוע בתחתית.

## 7. שפה חזותית (global.css)

- **CSS Variables** מתוך ה-Style Guide: `--green #00D26A`, `--red #FF3B30`, `--yellow #FFD600`, `--blue #00A3FF`, `--charcoal #0F0F0F`, `--soft-gray #E5E5E5`, `--white #FFFFFF`; ריווח `--space-1..4` = `8/12/16/24px`.
- **רקע כחול-כהה וכרטיסים:** ל-DESIGN אין ערך HEX מחייב לרקע (DESIGN 2.1). ייבחר ערך מקורב ל-Mockups (למשל גרדיאנט עדין סביב `#0B1426`, כרטיסים `#121E36` עם גבול כחול עדין) ויוגדר כמשתנה אחד (`--bg`, `--surface`, `--border`) כדי שיהיה קל לשנות אם תרצי ערך אחר.
- **Typography:** `font-family: 'Heebo', Arial, sans-serif`; גדלים ומשקלים לפי טבלת DESIGN 2.2.
- **פונט מקומי:** Heebo נטען מחבילת `@fontsource/heebo` (נארז עם האפליקציה) ולא מ-Google Fonts, כי ARCHITECTURE 2.7 אוסר תלות בפונטים מ-CDN חיצוני (נדרש ל-Offline ב-M5). ההחלטה תתועד כ-**ADR-1** ב-ARCHITECTURE.md.
- **פריסת מובייל:** `body` עם `margin: 0`; מעטפת אפליקציה `max-width: 480px` ממורכזת, גובה `100dvh`, Flex אנכי: תוכן (גולל) + ניווט תחתון. `padding` עם `env(safe-area-inset-*)`. `overflow-x: hidden` אינו הפתרון — כל הרכיבים יוגדרו ברוחב יחסי כך שלא תיווצר גלילה אופקית מלכתחילה.
- `prefers-reduced-motion`: ביטול transitions (הכנה לאנימציות של M2).

## 8. בדיקות אוטומטיות (`src/App.test.tsx`)

1. מסך בית מוצג כברירת מחדל: כותרת "סיימון", "שלב 0 מתוך 10", כפתור "התחל", וארבעה כפתורי רבעים לפי השמות בעברית.
2. סדר הרבעים ב-DOM תואם למיקום (ירוק, אדום, צהוב, כחול לפי סדר ה-Grid).
3. לחיצה על "אודות" ← מוצגים "על המשחק", הוראות, "10 המשחקים האחרונים" ו"עדיין אין משחקים שמורים"; הלוח כבר לא מוצג; לשונית "אודות" מסומנת `aria-current`.
4. לחיצה על "בית" ← חזרה ללוח.
5. אין שינוי ב-`window.location` בעת מעבר (אין ניווט דף).

## 9. בדיקה עצמית בזמן הבנייה

1. `npm run typecheck`, `npm run test`, `npm run build` — כולם עוברים.
2. הרצת `npm run dev` ובדיקה בדפדפן המובנה ב-Viewport מובייל (375×812 ו-320 רוחב):
   - צילום מסך של שני המסכים והשוואה ל-Wireframes/Mockups.
   - בדיקה ב-JavaScript ש-`document.documentElement.scrollWidth <= clientWidth` (אין גלילה אופקית).
   - בדיקה ש-`<html lang="he" dir="rtl">`.
   - מעבר בית ↔ אודות ואימות שהדף לא נטען מחדש.
3. סגירת שרת הפיתוח בסיום.

## 10. עדכוני מסמכים בסיום הבנייה

- `CLAUDE.md` → "פקודות הרצה": `npm run dev` ו-`npm run test`.
- `ARCHITECTURE.md` → הוספת `## החלטות מרכזיות (ADRs)` עם ADR-1 (פונט Heebo מקומי).
- `MILESTONES.md` → 🟡 ליד כותרת Milestone 1.
- ללא commit/push (לפי CLAUDE.md, עד שתבקשי).

## 11. הערות על סתירות בין המקורות (כבר הוכרעו לפי כללי CLAUDE.md)

- **מיקום הצבעים בלוח:** ה-Wireframe מציג כחול/אדום למעלה וירוק/צהוב למטה, אך DESIGN.md (וגם MILESTONES.md) קובע במפורש את סידור ה-Mockups: ירוק ↖, אדום ↗, צהוב ↙, כחול ↘. המסמך גובר על התמונה, ולכן נבחר הסידור של DESIGN.md.
- **פריטים ב-Mockups שאינם ב-PRD** (כפתור הגדרות, מסך הגדרות, כפתור "היסטוריית משחקים" במסך הבית, "גרסה", כפתור "פיתוח", לוגו באנגלית) — לא ימומשו.

## 12. Definition of Done (מתוך MILESTONES.md) ואיך נבדוק

| תנאי | אופן בדיקה |
|---|---|
| `npm run build` ו-typecheck מצליחים; בדיקת Render/Navigation עוברת | הרצת הפקודות + `npm run test` |
| שני המסכים נפתחים, מעבר בלי רענון, אין מסך שלישי | בדיקה אוטומטית 3–5 + בדיקה בדפדפן |
| ארבעת הרבעים במיקום נכון, חיווי שלב, "התחל"; אודות עם הסבר והודעת היסטוריה ריקה | בדיקות 1–3 + צילום מסך |
| טקסטים בעברית, RTL, נוח ב-Smartphone אנכי, ללא גלילה אופקית | צילום מסך ב-375/320 + בדיקת scrollWidth |
| אין יכולות מחוץ ל-PRD, אין Backend/Database | סקירת הקוד והתלויות ב-`package.json` |
