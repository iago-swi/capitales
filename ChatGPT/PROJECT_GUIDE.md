# Capitales — Project Guide

This document explains how the Capitales project works, how to run and build it, where its data is stored, and how to extend it safely.

## 1. What the project is

Capitales is a world-capitals quiz available in three forms:

- A browser game.
- A native Windows application.
- A native Linux application.

All editions share the same React application, game rules, country data, map rendering, translations, and SQLite schema. Electron provides the Windows and Linux application shells.

A run contains ten distinct countries and gives 15 seconds per question. Players identify a marked capital in Name or place the named capital in Place. Each mode has its own SQLite top ten.

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
ChatGPT/
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

- `Capitales Setup 2.0.0.exe`: standard one-click installer.
- `Capitales 2.0.0.exe`: portable application.
- `win-unpacked/Capitales.exe`: unpacked development output.

The version and product name come from `package.json`. Increase `version` before making a new public release.

Windows may temporarily lock Electron files during packaging because of antivirus scanning or file indexing. If electron-builder reports an `EPERM` rename error, wait briefly, close any running Capitales process, remove only the incomplete `release/win-unpacked.tmp` directory, and retry.

### Linux build

```powershell
npm run build:linux
```

This creates an x64 AppImage and a portable `.tar.gz` archive in `release/`. Make the AppImage executable before launching it:

```bash
chmod +x Capitales-2.0.0-x86_64.AppImage
./Capitales-2.0.0-x86_64.AppImage
```

For an archive cross-built on Windows, extract it and restore the Linux executable bits before launching:

```bash
tar -xzf Capitales-2.0.0-x64.tar.gz
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

### Database schema and rankings

Version 2 creates `mode_scores(id, mode, name, score)`. The original `scores` table remains available for historical inspection. The game ranks the ten highest positive point totals within each mode. Earlier entries win ties. Once a board is full, a new entry must beat tenth place.

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
SELECT mode, name, score FROM mode_scores ORDER BY mode, score DESC, id;
```

Avoid editing the database while the game is running because the application may overwrite the file with its in-memory copy.

### Resetting scores

Use **Clear list** on the selected mode’s leaderboard to clear just that board. The steps below reset the entire database, including the archive.

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

`game.ts` shuffles the catalogue without replacement. Name draws regional distractors first and filters alternative capitals. `scoring.ts` computes the award once per answer. An instant correct answer earns 200 points, rising to 400 on the fifth consecutive hit. In Place, speed pays only inside the target. At twice its radius the award reaches zero. Beyond it, the penalty grows to a maximum of 100 points. An empty placement costs 100.

## 8. Country outlines and capital positions

The renderer fits a longitude-rotated Mercator projection to the polygon containing the capital (or the nearest polygon), surrounding islands within a distance threshold, and the capital itself. This keeps places such as metropolitan France readable, and centres the longitude seam opposite the capital for Pacific countries. Taps are transformed from screen coordinates into the SVG frame and then inverted to longitude and latitude. Haversine distance uses a radius of 6,371 km. The target circle uses 15% of the farthest corner distance, with a 25 km floor for microstates.

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

## 13. Current limitations

Rankings stay on the current browser origin or in the desktop profile. National outlines and capital positions follow the bundled catalogue and atlas.

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
- Ten-question dealing lives in `src/game.ts`. The clock and points live in `src/scoring.ts`.
- Change country catalogue: `src/countries.json` and its type in `src/data.ts`.
- Change translations: `src/i18n.ts`.
- Change high-score behavior or schema: `src/database.ts`.
- Change colors, typography, or responsive layout: `src/styles.css`.
- Change the Windows database filename: `databasePath()` in `electron/main.cjs`.
