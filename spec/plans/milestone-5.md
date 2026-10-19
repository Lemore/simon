# תוכנית – Milestone 5: PWA, Offline ופרסום ב-GitHub Pages

> מקורות: `PRD.md` (4.5 PWA ו-Offline, Edge Case "דפדפן שאינו תומך בהתקנה", 5א), `ARCHITECTURE.md` (1 – סיכוני PWA ועדכונים, 2.2 PWA Layer, 2.7 PWA/Offline/עדכונים, 2.8 HTTPS, 2.9 GitHub/Build/Deployment, 2.10), `DESIGN.md` (צבעים, Iconography), `MILESTONES.md` (Milestone 5).
> נקודת מוצא: הקוד של Milestone 4 – SPA עם `App.tsx` שמחזיק את `useGame()` ו-`useHistory()`; `vite.config.ts` עם React plugin ו-Vitest בלבד; `public/favicon.svg` (לוח Simon); הפונט Heebo נארז מקומית (ADR-1); הצלילים מופקים ב-Web Audio ללא קבצים. ה-Repository: `https://github.com/Lemore/simon` → כתובת הפריסה הצפויה `https://lemore.github.io/simon/`.

## 1. מטרה ותחום

האפליקציה הופכת ל-PWA שניתן להתקין ושעובד Offline אחרי טעינה ראשונה, ומתפרסמת אוטומטית ל-GitHub Pages בכל Push ל-`main`. עדכון גרסה לעולם אינו מרענן משחק פעיל.

**בתחום:** `vite-plugin-pwa` (Manifest בעברית, אייקונים, Service Worker עם Precache); נתיב בסיס `/simon/`; בקשת עדכון שמוצגת רק כשאין משחק פעיל; Workflow של GitHub Actions; בדיקות Regression ובדיקה ידנית מלאה במובייל.

**מחוץ לתחום:** Background Sync, Push Notifications, Cache דינמי, כפתור "התקן" בתוך האפליקציה (ההתקנה נעשית דרך הדפדפן), Custom Domain, שינוי בחוקי המשחק או במסכים.

## 2. קבצים

### חדשים
| קובץ | תפקיד |
|---|---|
| `public/pwa-192x192.png`, `public/pwa-512x512.png`, `public/maskable-icon-512x512.png`, `public/apple-touch-icon-180x180.png`, `public/favicon.ico` | אייקוני התקנה, נוצרים **פעם אחת** מ-`favicon.svg` ונשמרים ב-Repository |
| `src/pwa/UpdatePrompt.tsx` / `.css` | הודעת "גרסה חדשה זמינה" עם כפתור עדכון – רק כשאין משחק פעיל |
| `src/pwa/UpdatePrompt.test.tsx` | בדיקות: ההודעה לא מופיעה במשחק פעיל, מופיעה כשהמשחק לא פעיל, ועדכון רק בלחיצה |
| `src/pwa/pwa-register.d.ts` (או הפניה ב-`tsconfig.app.json`) | הגדרות TypeScript למודול `virtual:pwa-register/react` |
| `.github/workflows/deploy.yml` | Pipeline: בדיקות → Build → פריסה ל-Pages |

### קיימים שישתנו
| קובץ | שינוי |
|---|---|
| `package.json` / `package-lock.json` | Dev dependencies: `vite-plugin-pwa` (2.x, תומך Vite 8), `workbox-window`; חד-פעמי להפקת אייקונים: `@vite-pwa/assets-generator` (דרך `npx`, לא נשאר כתלות) |
| `vite.config.ts` | `base` לפי פקודה; הגדרת `VitePWA` |
| `index.html` | קישור ל-`apple-touch-icon`, `favicon.ico`, `description`; וידוא שכל הקישורים עוברים דרך `base` |
| `src/App.tsx` | הצגת `<UpdatePrompt gameActive={...} />` |
| `src/test/setup.ts` | Mock ל-`virtual:pwa-register/react` כדי שבדיקות קיימות ירוצו ללא Service Worker |
| `.gitignore` | הוספת `dev-dist/` (תיקיית SW של מצב פיתוח, אם תיווצר) |
| `CLAUDE.md` | עדכון "פקודות הרצה": `npm run build && npm run preview` לבדיקת PWA/Offline מקומית בכתובת `http://localhost:4173/simon/`, וכתובת האתר המפורסם |
| `spec/ARCHITECTURE.md` | ADR-7, ADR-8 (סעיף 10) |
| `spec/MILESTONES.md` | סימון 🟡 בסיום הבנייה |

## 3. נתיב בסיס (Base Path)

- `vite.config.ts` הופך לפונקציה: `base: command === 'build' ? '/simon/' : '/'`.
  - `npm run dev` נשאר ב-`http://localhost:5173/` (כמו היום).
  - `npm run build` / `npm run preview` / GitHub Pages משתמשים ב-`/simon/`, כך שה-Preview המקומי זהה לאתר המפורסם.
- Vite מוסיף את ה-`base` אוטומטית ל-Assets, לקישורים ב-`index.html` ולקובצי הפונט. לאמת ב-`dist/index.html` שאין שום קישור שמתחיל ב-`/` ללא `/simon/`.
- אין Router – שני המסכים נשארים State פנימי, כך שאין Deep Links ואין בעיית 404 ב-Pages.

## 4. PWA – הגדרת `VitePWA`

```ts
VitePWA({
  strategies: 'generateSW',
  registerType: 'prompt',          // never autoUpdate (ARCHITECTURE 2.7)
  injectRegister: false,           // registration done by useRegisterSW in UpdatePrompt
  includeAssets: ['favicon.svg', 'favicon.ico', 'apple-touch-icon-180x180.png'],
  manifest: {
    name: 'סיימון – משחק זיכרון',
    short_name: 'סיימון',
    description: 'משחק זיכרון של צבעים וצלילים',
    lang: 'he',
    dir: 'rtl',
    display: 'standalone',
    orientation: 'portrait',
    start_url: '/simon/',
    scope: '/simon/',
    theme_color: '#0b1426',        // same as index.html theme-color
    background_color: '#0b1426',
    icons: [192, 512, maskable 512],
  },
  workbox: {
    globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
    navigateFallback: 'index.html',  // SPA fallback, inside the app scope only
    cleanupOutdatedCaches: true,
    // no skipWaiting / clientsClaim: the new version waits until the player agrees
  },
})
```

- **Precache** כולל HTML, JS, CSS, אייקונים וקובצי הפונט Heebo (`.woff2` – רק המשקלים/תת-הקבוצות שבשימוש; אם Fontsource מוסיף קבצים `.woff` מיותרים, לא לכלול אותם). אין קובצי אודיו – הצלילים נוצרים בקוד, ולכן עובדים Offline מעצמם.
- **אין** Runtime Caching ואין בקשות לרשת חיצונית.
- לבדוק ב-Build את גודל ה-Precache ואת רשימת הקבצים שנכנסו (הפלאגין מדפיס אותה).
- מצב פיתוח (`devOptions`) נשאר כבוי – ה-SW נבדק רק על Build.

## 5. אייקונים

- הפקה חד-פעמית מ-`public/favicon.svg` (לוח Simon הקיים, צבעי ה-Style Guide) באמצעות `npx @vite-pwa/assets-generator --preset minimal-2023 public/favicon.svg`.
- התוצרים נשמרים ב-`public/` ונכנסים ל-Git; אין שלב הפקה ב-CI.
- **Maskable:** הלוח ממוקם על רקע כהה מלא (`#0b1426`) עם שוליים בטוחים, כדי שמסכות עגולות/מרובעות של Android לא יחתכו את הרבעים.
- לבדוק חזותית את ה-PNG שנוצרו לפני השמירה.

## 6. עדכון גרסה ללא קטיעת משחק – `UpdatePrompt`

- משתמש ב-`useRegisterSW()` מ-`virtual:pwa-register/react`, שמחזיר `needRefresh` ו-`updateServiceWorker()`.
- `App` מעביר `gameActive = status ∈ {presenting, awaitingInput, paused}`.
- **התנהגות:**
  - כשיש גרסה חדשה **ו**אין משחק פעיל (`idle` / `won` / `lost`) – מוצגת הודעה קטנה מעל פס הניווט: **"גרסה חדשה זמינה"** + כפתור **"עדכן"** + כפתור **"לא עכשיו"**.
  - בזמן משחק פעיל או מושהה – ההודעה **מוסתרת**; היא תופיע מעצמה כשהמשחק יסתיים או יחזור למצב התחלה.
  - רק לחיצה על **"עדכן"** מפעילה את הגרסה החדשה ומרעננת. "לא עכשיו" מסתיר את ההודעה עד הטעינה הבאה; הגרסה החדשה תופעל ממילא בפתיחה הבאה של האפליקציה.
  - אין `skipWaiting` אוטומטי – לכן גם אם המשתמש לא לוחץ, אין רענון כפוי.
- עיצוב: כרטיס כהה בסגנון ההודעות הקיימות, טקסט בעברית, RTL, `role="status"`. הדבר **אינו מתואר ב-DESIGN** – אשתמש ברכיבים ובצבעים הקיימים בלבד (ראה סעיף 11).
- כשל ברישום ה-SW (למשל דפדפן ללא תמיכה) – נבלע בשקט; האתר ממשיך לעבוד כאתר רגיל (PRD Edge Case).

## 7. GitHub Actions – `.github/workflows/deploy.yml`

```yaml
on:
  push: { branches: [main] }
  workflow_dispatch:
permissions: { contents: read, pages: write, id-token: write }
concurrency: { group: pages, cancel-in-progress: false }
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - actions/checkout
      - actions/setup-node (node 24 LTS, cache: npm)
      - npm ci
      - npm run typecheck
      - npm run test
      - npm run build
      - actions/configure-pages
      - actions/upload-pages-artifact (path: dist)
  deploy:
    needs: build
    environment: { name: github-pages, url: ${{ steps.deployment.outputs.page_url }} }
    runs-on: ubuntu-latest
    steps:
      - actions/deploy-pages (id: deployment)
```

- כשל בכל שלב בדיקה/Build עוצר לפני פריסה.
- גרסאות ה-Actions ייקבעו לגרסאות היציבות העדכניות בזמן הבנייה.

## 8. פעולות שנעשות על ידי המשתמש (עם הדרכה צעד-אחר-צעד בזמן הבנייה/הדחיפה)

1. **לוודא שה-Repository `Lemore/simon` ציבורי** – GitHub Pages בחשבון חינמי עובד רק ל-Repository ציבורי.
2. ב-GitHub: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. אישור ה-Push – הפריסה מתרחשת רק אחרי Push ל-`main`, ולכן לא אדחוף בלי אישור מפורש (לפי CLAUDE.md).
4. בדיקה בטלפון האמיתי: פתיחת הכתובת, התקנה, ומצב טיסה (רשימת בדיקה תינתן בשלב "הרץ כדי שאבדוק").

אין צורך במפתחות, סודות או קובץ `.env`.

## 9. בדיקות

### אוטומטיות
- **חדש – `UpdatePrompt.test.tsx`** (עם Mock ל-`useRegisterSW`):
  - `needRefresh` + משחק פעיל (`presenting`/`awaitingInput`/`paused`) → אין הודעה, `updateServiceWorker` לא נקרא.
  - `needRefresh` + `idle`/`won`/`lost` → ההודעה מוצגת; "עדכן" קורא ל-`updateServiceWorker(true)`; "לא עכשיו" מסתיר בלי לקרוא.
  - אין `needRefresh` → אין הודעה.
- **Regression (קיימות, חייבות לעבור ללא שינוי בהתנהגות):** עשרת השלבים וניצחון, כישלון ראשון (0 שלבים), קונפטי בניצחון בלבד, השהיה וחידוש (שני הכללים), שמירת עשר תוצאות, מחיקה מאושרת וביטול, כשל אחסון. אם חסר כיסוי לאחד מהם – להשלים.
- `npm run typecheck`, `npm run test`, `npm run build` – עוברים.

### בדיקות Build מקומיות (אני מריץ)
- `dist/` מכיל `manifest.webmanifest`, `sw.js`, `workbox-*.js`, האייקונים והפונטים; כל הנתיבים תחת `/simon/`.
- `npm run preview` → `http://localhost:4173/simon/` בדפדפן המובנה:
  - ב-DevTools/JS: ה-Manifest נטען ותקין, ה-SW במצב `activated`, ורשימת ה-Precache כוללת את כל הקבצים.
  - **Offline:** אחרי טעינה מלאה – לחסום רשת (עצירת שרת ה-Preview), לרענן: האפליקציה נפתחת, שני המסכים, משחק והיסטוריה עובדים, אין שגיאות 404 בקונסול.
  - **עדכון:** Build חדש עם שינוי קטן בזמן משחק פעיל → אין רענון ואין הודעה; אחרי סיום המשחק → ההודעה מופיעה; "עדכן" מרענן לגרסה החדשה.
  - תצוגת Smartphone אנכית, עברית/RTL, ללא גלילה אופקית.

### אחרי הפריסה (צריך Push – באישורך)
- ה-Workflow ב-Actions ירוק ומפרסם אוטומטית.
- `https://lemore.github.io/simon/` נטען ב-HTTPS, ללא 404 למשאבים.
- בטלפון: התקנה (Android – "התקן אפליקציה"; iPhone – "שתף ← הוסף למסך הבית"), משחק עם צלילים, השהיה/חידוש בנעילת מסך, ופתיחה מחדש במצב טיסה.

> בדיקות שלא אוכל לבצע בעצמי (טלפון אמיתי, התקנה, צלילים במכשיר, האתר המפורסם לפני Push) יסומנו בבירור כ"לא נבדק – ממתין לבדיקה שלך", ולא כעוברות.

## 10. ADRs שיתווספו ל-ARCHITECTURE.md

**ADR-7: נתיב בסיס `/simon/` רק ב-Build**
- **הקשר:** GitHub Pages של Repository פרויקט מגיש את האתר תחת `/<repo>/`, אבל שרת הפיתוח הקיים עובד בשורש.
- **החלטה:** `base: '/simon/'` ל-`build`/`preview`, ו-`/` ל-`dev`. `start_url` ו-`scope` במניפסט – `/simon/`.
- **השלכות:** כתובת הפיתוח לא משתנה; ה-Preview המקומי משקף את האתר המפורסם. שינוי שם ה-Repository או Custom Domain מחייב עדכון במקום אחד.

**ADR-8: עדכון גרסה רק כשאין משחק פעיל**
- **הקשר:** סעיף 2.7 אוסר רענון כפוי במהלך משחק.
- **החלטה:** `registerType: 'prompt'` ללא `skipWaiting`; הודעת "גרסה חדשה זמינה" מוסתרת בזמן `presenting`/`awaitingInput`/`paused`, ורק לחיצה על "עדכן" מפעילה את הגרסה החדשה. אייקונים מופקים פעם אחת ונשמרים ב-Repository.
- **השלכות:** משחק פעיל לעולם לא נקטע; משתמש שלא מאשר יקבל את הגרסה החדשה בפתיחה הבאה של האפליקציה.

## 11. נקודה לאישורך

הודעת העדכון ("גרסה חדשה זמינה" / "עדכן" / "לא עכשיו") מוגדרת ב-ARCHITECTURE (2.7) אבל **אין לה עיצוב ב-DESIGN או בתמונות**. אבנה אותה כהודעה קטנה בסגנון הכרטיסים הקיימים, מעל פס הניווט. אם עדיף בלי הודעה בכלל (העדכון ייכנס פשוט בפתיחה הבאה של האפליקציה) – יש לעדכן אותי לפני הבנייה.

## 12. Definition of Done – מיפוי

| תנאי | איך מכוסה |
|---|---|
| Workflow עובר בדיקות ו-Build ומפרסם אוטומטית אחרי Push | סעיף 7; נבדק אחרי Push באישורך |
| האתר נטען ב-HTTPS בנתיב הפרויקט ללא 404 | סעיפים 3, 7; Preview מקומי תחת `/simon/` + בדיקה על האתר המפורסם |
| Manifest ו-SW תקינים; אפשרות התקנה | סעיפים 4–5; DevTools ב-Preview; התקנה בטלפון שלך |
| Offline אחרי Precache: פתיחה, משחק, צלילים, ניווט, היסטוריה | סעיף 4; בדיקת Offline ב-Preview ובטלפון |
| עדכון גרסה אינו מרענן משחק פעיל | סעיף 6; בדיקות `UpdatePrompt` + בדיקת עדכון ב-Preview |
| Regression + Smartphone אנכי בעברית/RTL | סעיף 9 |
