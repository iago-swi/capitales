# Capitales changelog

Changes to the Claude version of Capitales, newest first. Each version is tagged `claude-vX.Y.Z` and published with these notes on the [releases page](https://github.com/iago-swi/capitales/releases). The rules are in [VERSIONING.md](../VERSIONING.md).

## [1.0.3] - 2026-11-22

### Added

- The game can be played online, straight from the browser: <https://iago-swi.github.io/capitales/Claude/>. Like the downloadable `index.html`, it needs no server, and its scores stay in your browser.

### Changed

- The title screen shows the version number, small, at the end of the bottom line.

### Documentation

- The folder is now `Claude/` (it was `claude/`), like the other game repositories.
- A new README with a link to play online, how to play, the downloads and technical notes.
- This changelog, rebuilt from the history for the earlier versions.
- Smaller JPEG screenshots in place of the PNG ones.

## [1.0.2] - 2026-08-26

### Added

- A credits page, hidden behind the logo: press the **Capitales** wordmark seven times on the title screen. Three faces, with who did what. It is in French only, on purpose: the captions are puns that do not survive translation.
- Swipe left or right to go from one face to the next. A tap on the face works too.

## [1.0.1] - 2026-08-26

### Added

- **High scores** on the title screen: the top ten of the selected mode, without having to finish a game first. The list can be cleared.
- In **Place** mode, a dashed red circle around the real capital shows the target zone after each answer.

### Changed

- **Place** mode is scored against the map on screen rather than against the globe: being 200 km out costs far more in Switzerland than in Canada. A marker near the capital scores most, the score falls to zero at twice the target radius, and a marker beyond that loses points. Clicking the middle of the map without knowing the answer no longer pays.
- The best score and the **High scores** link sit centred on one line at the bottom of the title screen, in the same small type.

### Fixed

- A placement that costs points shows `-15` instead of `+-15`.

## [1.0.0] - 2026-08-26

First version. It was not published as a GitHub release.

### Added

- A capital-cities quiz on 193 countries, in English and French. Each question shows a country's outline, drawn offline from Natural Earth data.
- Two modes. **Name**: the marker is on the capital, pick the city out of four. **Place**: the city is named, put the marker where you think it is; points fall off with distance.
- 15 seconds a question, ten questions a game, a speed bonus and a streak multiplier, and a separate top-ten list for each mode.
- Builds for the browser (one HTML file that works offline), Windows (installer and portable), Linux and Android.

[1.0.3]: https://github.com/iago-swi/capitales/releases/tag/claude-v1.0.3
[1.0.2]: https://github.com/iago-swi/capitales/releases/tag/claude-v1.0.2
