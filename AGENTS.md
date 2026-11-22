# Instructions for AI assistants

This repository holds two versions of one game, Capitales, each built by a different assistant: `Claude/` and `ChatGPT/`. The other assistant pushes here while you work.

- Run `git pull --rebase` before every push.
- Work only in your own folder. Never edit the other version's files, changelog, tags or releases.
- Shared files (the root `index.html` and `README.md`, `VERSIONING.md`, this file, `.github/`): keep what is there and change only your own parts. In `.github/workflows/pages.yml`, each version has its own build job.
- Every change to a game that a player can notice is released. Add an entry to that game's `CHANGELOG.md`, raise its version, tag the commit and push the tag, exactly as [VERSIONING.md](VERSIONING.md) describes. The work is not finished until the release is published on GitHub.
- Never move or delete a tag that has been pushed.
- Write documentation in English, and state only what the code and the existing documents show.
