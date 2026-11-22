# Versions and release notes

Each version of Capitales in this repository has its own version number, its own changelog and its own releases. Two assistants work here, so each one releases only its own version.

| Game | Folder | Changelog | Tags |
| --- | --- | --- | --- |
| Capitales, Claude version | `Claude/` | [Claude/CHANGELOG.md](Claude/CHANGELOG.md) | `claude-vX.Y.Z` |
| Capitales, ChatGPT version | `ChatGPT/` | [ChatGPT/CHANGELOG.md](ChatGPT/CHANGELOG.md) | `chatgpt-vX.Y.Z` |

Published releases: <https://github.com/iago-swi/capitales/releases>

## Rules

1. Every change to a game that a player can notice gets a new version, with a section in that folder's `CHANGELOG.md`. The change is finished when its release is published. Several changes pushed together are one version, numbered by the largest of them.
   Documentation-only changes (a README, a screenshot) get no version, no tag and no release. They go through a pull request like every other change (see below) and can be listed under `Documentation` in the next version's notes.
2. The version is `X.Y.Z`:
   - `Z` goes up when something is fixed or adjusted and nothing new is added: a bug fix, tuning, wording, visual polish.
   - `Y` goes up when the player gets something new: a feature, a screen, a mode, a control. `Z` returns to 0.
   - `X` goes up for a rebuild, or a change that makes earlier scores or saved data invalid. `Y` and `Z` return to 0.
3. The tag is the folder name in lower case, `-v`, and the version: `claude-v1.1.0`.
4. A pushed tag is never moved or deleted. A mistake is corrected with a new version.
5. Shared files (the root `index.html` and `README.md`, this file, `AGENTS.md`, `.github/`) have no version. If a release also changes them, say so in that game's notes.
6. A game shows its version on its start screen. The version lives in the `package.json` at the root of its folder; the release workflow refuses to publish when that number differs from the tag.

## Releasing a change

Every change reaches `main` through a branch and a pull request. Nothing is committed or pushed directly on `main`. `main` is never force-pushed, and existing history is not rewritten.

When the owner says **"publish"**, do all the steps below. When the owner says **"open a pull request"**, stop after step 4 and give the link.

1. Bring `main` up to date and create a branch from it:

   ```bash
   git switch main
   git pull --ff-only
   git switch -c release/claude-v1.1.0
   ```

   The branch is `release/<tag>` for a version (`release/claude-v1.1.0`, `release/chatgpt-v2.1.0`) and `docs/<short-name>` for a change to the documentation only (`docs/readme-screenshots`).

2. For a version, add a section at the top of the game's `CHANGELOG.md`, above the previous version:

   ```markdown
   ## [1.1.0] - 2026-12-03

   ### Added

   - What the player can now do, in a plain sentence.
   ```

   Use the headings that apply: `Added`, `Changed`, `Fixed`, `Removed`, `Documentation`. Write for players first, then for people who read the code. Add the link line for the new version at the bottom of the file.

   Set the same number in the folder's `package.json` (and wherever else that game keeps it).

3. Commit on the branch, the changelog together with the change, under the owner's Git identity. The message is plain and carries no attribution lines (no `Co-Authored-By`, no `Generated with`).

4. Push the branch and open a pull request:

   ```bash
   git push -u origin release/claude-v1.1.0
   gh pr create --base main --title "Capitales 1.1.0 (Claude): a few words" --body-file notes.md
   ```

   The title is the version number and a few words. The body is the changelog section for this version, in plain language for users. A documentation change has no version: its title and body say what changed.

5. Merge it with a merge commit, not a squash and not a rebase:

   ```bash
   gh pr merge --merge --delete-branch
   ```

   If `main` has moved and the pull request no longer merges, merge `main` into the branch and push it again.

6. A documentation change ends here: no version, no tag, no release. For a version, tag the merge commit on `main` and push the tag on its own:

   ```bash
   git switch main
   git pull --ff-only
   git tag -a claude-v1.1.0 -m "Capitales 1.1.0 (Claude)"
   git push origin claude-v1.1.0
   ```

7. Pushing the tag starts the [Release workflow](.github/workflows/release.yml). It reads the section for that version from the changelog and publishes it as a GitHub release titled "Capitales 1.1.0 (Claude)". Then attach the downloadable builds:

   ```bash
   gh release upload claude-v1.1.0 path/to/index.html
   gh release view claude-v1.1.0
   ```

## Correcting a release note

Edit the changelog and publish it through a `docs/` pull request. Then run the workflow again for the existing tag, which replaces the published notes and keeps the attached files:

```bash
gh workflow run release.yml -f tag=claude-v1.1.0
```

The same command publishes a release for a tag whose workflow run failed.

## Playing online

The [Pages workflow](.github/workflows/pages.yml) runs on every push to `main`. It builds each version in its own job and publishes the landing page at <https://iago-swi.github.io/capitales/>, with the games under `/Claude/` and `/ChatGPT/`. A version whose build fails is left out of that deployment; the other one is still published.
