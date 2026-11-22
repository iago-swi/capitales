# Capitales changelog

Changes to the ChatGPT version of Capitales, newest first. Each version is tagged `chatgpt-vX.Y.Z` and published with these notes on the [releases page](https://github.com/iago-swi/capitales/releases). The rules are in [VERSIONING.md](../VERSIONING.md).

## [1.0.1] - 2026-11-22

### Added

- The browser edition can be played directly from GitHub Pages under `/capitales/ChatGPT/`.

### Changed

- The start screen now shows the version number.

### Documentation

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
