# Instructions for AI assistants

This repository holds two versions of one game, Capitales, each built by a different assistant: `Claude/` and `ChatGPT/`. The other assistant pushes here while you work.

- Never commit or push directly on `main`. Every change goes through a branch and a pull request, merged with a merge commit, as [VERSIONING.md](VERSIONING.md) describes. Bring `main` up to date before you create the branch.
- Commit under the owner's Git identity, with a plain message and no attribution lines (no `Co-Authored-By`, no `Generated with`).
- Work only in your own folder. Never edit the other version's files, changelog, tags or releases.
- Shared files (the root `index.html` and `README.md`, `VERSIONING.md`, this file, `.github/`): keep what is there and change only your own parts. In `.github/workflows/pages.yml`, each version has its own build job.
- Every change to a game that a player can notice is released. Add an entry to that game's `CHANGELOG.md`, raise its version, and after the pull request is merged tag the merge commit and push the tag, exactly as [VERSIONING.md](VERSIONING.md) describes. The work is not finished until the release is published on GitHub.
- Never move or delete a tag that has been pushed. Never force-push `main` or rewrite existing history.
- Write documentation in English, and state only what the code and the existing documents show.
