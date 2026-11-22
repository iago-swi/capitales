# Capitales changelog

Changes to the ChatGPT version of Capitales, newest first. Each version is tagged `chatgpt-vX.Y.Z` and published with these notes on the [releases page](https://github.com/iago-swi/capitales/releases). The rules are in [VERSIONING.md](../VERSIONING.md).

## [2.0.0] - 2026-11-22

### Added

- Switch between Name and Place in English or French. In Place, tap the map to guess and see the distance to the capital.
- Race a 15-second clock through ten different countries. Use Enter to start and A–D or 1–4 to answer in Name.
- See your best streak in Name and your average error and on-target count in Place. Each mode has a top ten that you can clear independently.

### Changed

- Correct answers earn points for speed and streaks. Place rewards accuracy relative to the map and deducts up to 100 points for a distant guess or timeout.
- Indigo backgrounds, periwinkle land and coral markers distinguish this edition. The layout keeps its original proportions.
- Earlier scores out of ten stay in the original SQLite table as an archive. Both new rankings start empty.

### Fixed

- Corrected the location of St. George's in Grenada so the map and placement target agree.

### Documentation

- Both READMEs and the landing page show the two modes side by side. The ChatGPT Pages job includes the Place screenshot.

## [1.0.1] - 2026-11-22

### Added

- The browser edition can be played directly from GitHub Pages under `/capitales/ChatGPT/`.

### Changed

- The start screen now shows the version number.
- Added a compact gameplay screenshot, release notes, online play and download links, and detailed technical notes.

## [1.0.0] - 2026-09-19

First release.

### Added

- A ten-question world-capitals quiz covering 195 countries, with each country outline and capital marker drawn on an interactive map.
- Four answer choices per question, with distractors drawn from the same region first.
- English and French interfaces that can be switched during play.
- A local top-ten score table backed by SQLite through `sql.js`, with a player-name prompt for qualifying scores.
- Browser, Windows and Linux editions sharing the same React application.

[1.0.1]: https://github.com/iago-swi/capitales/releases/tag/chatgpt-v1.0.1
[1.0.0]: https://github.com/iago-swi/capitales/releases/tag/chatgpt-v1.0.0
[2.0.0]: https://github.com/iago-swi/capitales/releases/tag/chatgpt-v2.0.0
