# Capitales — Project Guide

[French documentation](PROJECT_GUIDE_FR.md)

This document explains how the Capitales project works, how to run and build it, where its data is stored, and how to extend it safely.

## 1. What the project is

Capitales is a world-capitals quiz available in three forms:

- A browser game.
- A native Windows application.
- A native Linux application.

All editions share the same React application, game rules, country data, map rendering, translations, and SQLite schema. Electron provides the Windows and Linux application shells.

During each game:

1. The application selects one of 195 sovereign states.
2. It displays the country's outline without its name.
3. A yellow beacon marks the capital's geographic coordinates.
4. The player chooses among four capital names.
5. A game lasts ten questions.
6. A qualifying top-ten score prompts the player for a name.
7. The player name and score are stored in SQLite.

The interface can be switched between English and French at any time with the flag button.

## 2. Technology overview

| Area | Technology | Purpose |
| --- | --- | --- |
| Programming language | TypeScript | Application and game logic |
| User interface | React | Screens, controls, and state |
| Development/build tool | Vite | Development server and browser production bundle |
| Country rendering | D3 Geo | Fits geographic shapes into the SVG viewport and projects capital coordinates |
| Geographic source | `world-atlas` | Natural Earth-derived country boundary data |
| Geometry conversion | `topojson-client` | Converts TopoJSON country data into GeoJSON features |
| Database engine | `sql.js` | Runs SQLite as WebAssembly in both editions |
| Desktop shell | Electron | Packages the browser application for Windows and Linux |
| Desktop packaging | electron-builder | Creates Windows and Linux distributables |
| Unit testing | Vitest | Tests the question-generation rules |

## 3. Project layout

```text
Capitales/
├── electron/
│   ├── main.cjs             Windows process and SQLite-file persistence
│   └── preload.cjs          Safe bridge between React and Electron
├── src/
│   ├── App.tsx              Screens and overall game state
│   ├── CountryMap.tsx       Country outline and capital beacon
│   ├── countries.json       Complete generated country/capital catalogue
│   ├── data.ts              Typed access to the country catalogue
│   ├── database.ts          SQLite initialization, migration, and scores
│   ├── game.ts              Question and distractor generation
│   ├── game.test.ts         Unit tests
│   ├── i18n.ts              English/French text and geographic names
│   ├── main.tsx             React entry point
│   ├── styles.css           Complete visual design and responsive layout
│   └── vite-env.d.ts        TypeScript declarations for assets and Electron
├── dist/                    Generated browser production build
├── release/                 Generated Windows packages
├── index.html               Browser HTML entry point
├── package.json             Dependencies, scripts, and packaging settings
├── tsconfig*.json           TypeScript configuration
└── vite.config.ts           Vite and Vitest configuration
```

`dist/`, `release/`, and `node_modules/` are generated directories. Application changes should normally be made in `src/` or `electron/`.

## 4. Installing and running the project

### Requirements

- Windows 10 or later for the packaged Windows edition.
- A current Node.js installation.
- npm.

Install dependencies from the project directory:

```powershell
npm install
```

### Browser development

```powershell
npm run dev
```

Open the URL printed by Vite, normally:

```text
http://localhost:5173
```

Vite reloads the browser when source files change.

### Windows development

```powershell
npm run dev:windows
```

This starts Vite and opens the same application in Electron. Keep the terminal open while developing.

Desktop windows are centered and capped at 1120 × 720 logical pixels. If operating-system scaling leaves a smaller work area, Electron uses at most 90% of the available width and 88% of the available height. An Electron-only compact layout keeps the quiz and all ten leaderboard rows inside the window without scrollbars.

## 5. Building distributable editions

### Browser build

```powershell
npm run build
```

The production website is written to `dist/`. It must be served through a web server; opening `dist/index.html` directly with a `file://` URL may prevent the SQLite WebAssembly asset from loading.

To inspect the production build locally:

```powershell
npm run preview
```

### Windows build

```powershell
npm run build:windows
```

The generated files are written to `release/`:

- `Capitales Setup 0.1.0.exe`: standard one-click installer.
- `Capitales 0.1.0.exe`: portable application.
- `win-unpacked/Capitales.exe`: unpacked development output.

The version and product name come from `package.json`. Increase `version` before making a new public release.

Windows may temporarily lock Electron files during packaging because of antivirus scanning or file indexing. If electron-builder reports an `EPERM` rename error, wait briefly, close any running Capitales process, remove only the incomplete `release/win-unpacked.tmp` directory, and retry.

### Linux build

```powershell
npm run build:linux
```

This creates an x64 AppImage and a portable `.tar.gz` archive in `release/`. Make the AppImage executable before launching it:

```bash
chmod +x Capitales-0.1.0-x86_64.AppImage
./Capitales-0.1.0-x86_64.AppImage
```

For an archive cross-built on Windows, extract it and restore the Linux executable bits before launching:

```bash
tar -xzf Capitales-0.1.0-x64.tar.gz
cd linux-unpacked
chmod +x capitales chrome-sandbox chrome_crashpad_handler
./capitales
```

The portable archive can be cross-built from Windows with `npm run build:linux:archive`. AppImage creation requires Linux tooling such as `mksquashfs`, so run `npm run build:linux` on Linux for both formats. Final launch testing should be performed on Linux or in a Linux virtual machine.

## 6. How SQLite works

### Why `sql.js` is used

Browsers cannot normally open an arbitrary local database file. `sql.js` solves this by compiling SQLite to WebAssembly. The game executes normal SQLite statements in memory and then serializes the complete database into bytes for persistence.

The database API is implemented in `src/database.ts`. The rest of the application does not need to know whether it is running in a browser or Electron.

### Windows database location

In the installed or portable Windows application, the SQLite database is stored at:

```text
%APPDATA%\Capitales\capitales.sqlite
```

For the current Windows user, this is normally:

```text
C:\Users\<username>\AppData\Roaming\Capitales\capitales.sqlite
```

For example:

```text
C:\Users\Philippe Noth\AppData\Roaming\Capitales\capitales.sqlite
```

Electron determines the directory with `app.getPath('userData')` in `electron/main.cjs`. The file is created the first time the application starts successfully.

The portable executable is portable as a program, but its score database is still stored in the user's application-data directory. It is not stored beside the executable.

### Linux database location

On Linux, Electron stores the database below the XDG configuration directory, normally:

```text
~/.config/Capitales/capitales.sqlite
```

If `XDG_CONFIG_HOME` is set, the location is normally `$XDG_CONFIG_HOME/Capitales/capitales.sqlite`. Both the AppImage and archive edition use this user-data location; the database is not written beside the executable.

### Browser database location

The browser edition does not create a visible `.sqlite` file. The serialized database is Base64-encoded and saved in the browser's local storage with this key:

```text
capitales.sqlite.base64
```

This data belongs to the exact browser origin. For example, these origins have separate storage:

```text
http://localhost:5173
http://127.0.0.1:5173
https://example.com
```

Consequences:

- Different browsers have different score tables.
- Private/incognito windows normally discard the database.
- Clearing site data deletes the browser high scores.
- Changing hostname, protocol, or port creates a different storage area.
- Browser, Windows, and Linux scores are independent unless their database files are transferred manually.

### Database schema

The application creates this table:

```sql
CREATE TABLE scores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL DEFAULT 'Anonymous',
  score INTEGER NOT NULL,
  total INTEGER NOT NULL,
  played_at TEXT NOT NULL
);
```

Field meanings:

| Field | Meaning |
| --- | --- |
| `id` | Internal unique identifier |
| `name` | Player name, limited by the interface to 24 characters |
| `score` | Number of correct answers |
| `total` | Number of questions in that game, currently 10 |
| `played_at` | ISO 8601 timestamp used to resolve tied scores |

Older databases created before player names were introduced are migrated automatically. The application checks `PRAGMA table_info(scores)` and adds the `name` column if necessary.

### Top-ten rules

A score qualifies when:

- Fewer than ten scores have been stored, or
- The score is equal to or greater than the current tenth-place score.

After saving a qualifying score, the table is ordered by:

1. Highest score first.
2. Earliest achievement first when scores are tied.

Rows outside the best ten are deleted. A blank player name is saved as `Anonymous` or `Anonyme`, according to the selected interface language.

### Inspecting the Windows database

The file is a standard SQLite database and can be opened with tools such as SQLite CLI or DB Browser for SQLite while Capitales is closed.

Example with SQLite CLI:

```powershell
sqlite3 "$env:APPDATA\Capitales\capitales.sqlite"
```

Then:

```sql
.headers on
.mode column
SELECT * FROM scores ORDER BY score DESC, played_at ASC;
```

Avoid editing the database while the game is running because the application may overwrite the file with its in-memory copy.

### Resetting scores

Windows edition:

1. Close Capitales.
2. Back up the file if the scores matter.
3. Delete `%APPDATA%\Capitales\capitales.sqlite`.
4. Restart Capitales; it creates a new empty database.

Browser edition:

1. Open the browser's developer tools.
2. Open Application or Storage.
3. Select Local Storage for the game's origin.
4. Remove `capitales.sqlite.base64`.
5. Reload the game.

Deleting either database permanently removes its high scores unless a backup exists.

## 7. Game and scoring logic

Question generation lives in `src/game.ts`.

- The current country is excluded from the next random selection.
- Every question has four unique choices.
- The correct capital is always included.
- Capitals from the same geographic region are preferred as distractors.
- Other regions fill any remaining answer positions.
- Choices are shuffled before display.

The current game state lives in React inside `src/App.tsx`. The principal views are:

```text
welcome → game → name entry (if qualified) → high scores
                 └──────────────────────────→ high scores (if not qualified)
```

The score is incremented immediately when the correct choice is selected. Once an answer is selected, the choices are locked until the player advances.

## 8. Country outlines and capital positions

Country metadata is stored in `src/countries.json` and exposed through `src/data.ts`. The catalogue contains 195 sovereign states. Each entry contains:

```ts
type Country = {
  id: number
  name: string
  nameFr: string
  capital: string
  longitude: number
  latitude: number
  region: string
}
```

The numeric `id` matches the country identifier in `world-atlas/countries-10m.json`. This detailed resolution includes microstates.

`src/CountryMap.tsx` performs the rendering:

1. `topojson-client` extracts the requested country as GeoJSON.
2. D3's Mercator projection fits that geometry into the SVG viewport.
3. The same projection converts the capital's longitude and latitude into SVG coordinates.
4. The country path and animated capital beacon are drawn in one SVG.

Longitude must come before latitude when passing coordinates to D3:

```ts
projection([country.longitude, country.latitude])
```

Reversing those values produces an incorrect marker position.

## 9. English and French localization

Localization is implemented in `src/i18n.ts` without an external framework because the game is small.

It contains:

- All English interface text.
- All French interface text.
- French country names.
- French capital names where they differ from English.

Internally, game answers always use the English capital value from `data.ts`. Translation happens only when text is displayed. This keeps answer comparison independent of the selected language and lets players switch languages during a question without breaking the result.

The selected language is saved in browser local storage under:

```text
capitales.language
```

Electron's renderer also has local storage, so the Windows edition remembers the selection between sessions.

When adding interface text, add the same key to both `copy.en` and `copy.fr`. TypeScript will help detect inconsistent use, but translations still need human review.

## 10. Adding a country

To add a country:

1. Add its record to `src/countries.json`.
2. Use the numeric identifier from the `world-atlas` country dataset.
3. Verify the capital coordinates in longitude/latitude order.
4. Assign one of the existing region values so distractors work properly.
5. Add its French country name as `nameFr`.
6. Add the French capital name to `frenchCapitals` when needed.
7. Run the game and visually confirm both the outline and marker.

The country count on the welcome screen is calculated dynamically.

## 11. Testing and verification

Run unit tests:

```powershell
npm test
```

Run the TypeScript and production-build checks:

```powershell
npm run build
```

Before releasing, manually verify:

- English and French welcome screens.
- Switching languages during a question.
- Correct and incorrect answer feedback.
- All ten rounds.
- Name entry after a qualifying score.
- Top-ten ordering and persistence after restarting.
- Browser layout at desktop and mobile widths.
- Windows app startup and SQLite file creation.

## 12. Security and data considerations

- The game does not send scores or names to a server.
- All data remains on the local machine or in the browser profile.
- The Electron renderer cannot access Node.js directly.
- `electron/preload.cjs` exposes only two database operations: loading bytes and saving bytes.
- Player names are truncated to 24 characters before storage.
- React escapes displayed player names, preventing them from being interpreted as HTML.

The generated Windows executables use electron-builder's normal packaging process but are not signed with a purchased code-signing certificate. Windows SmartScreen may therefore warn users when the application is downloaded onto another computer.

## 13. Current limitations and sensible next improvements

Current limitations:

- Browser and Windows high scores do not synchronize.
- Browser SQLite persistence uses local storage, which is simple but less robust than IndexedDB for large databases.
- The Windows package uses Electron's default application icon.
- Fonts are requested from Google Fonts; fallback fonts are used without internet access.
- There is no sound, difficulty selector, continent selector, or timed mode.

Useful next improvements:

1. Periodically validate changes to capitals and official country names.
2. Add continent and difficulty filters.
3. Bundle fonts and a custom application icon for fully polished offline use.
4. Move browser persistence from local storage to IndexedDB or OPFS.
5. Add database export/import for transferring scores.
6. Add end-to-end tests for the complete ten-question and leaderboard flow.
7. Add a timer, streak bonuses, and accessibility options.

## 14. Useful commands

| Command | Action |
| --- | --- |
| `npm install` | Install dependencies |
| `npm run dev` | Run browser development edition |
| `npm run dev:windows` | Run Windows development edition |
| `npm test` | Run unit tests once |
| `npm run build` | Type-check and build browser edition |
| `npm run preview` | Serve the browser production build locally |
| `npm run build:windows` | Build installer and portable Windows executable |
| `npm run build:linux` | Build Linux AppImage and portable archive |
| `npm run build:linux:archive` | Cross-build the portable Linux archive from Windows |

## 15. Main configuration locations

- Change application version: `package.json` → `version`.
- Change Windows product name: `package.json` → `build.productName`.
- Change game length: `ROUND_LENGTH` in `src/App.tsx`.
- Change country catalogue: `src/countries.json` and its type in `src/data.ts`.
- Change translations: `src/i18n.ts`.
- Change high-score behavior or schema: `src/database.ts`.
- Change colors, typography, or responsive layout: `src/styles.css`.
- Change the Windows database filename: `databasePath()` in `electron/main.cjs`.
