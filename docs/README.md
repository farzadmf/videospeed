# Docs map

Read the matching doc before troubleshooting or adding a feature.

- `coding-style.md` — conventions beyond the linter: blank-line paragraphs, comments, commit messages.
- `TODO.md` — planned work not yet started.
- `../src/AGENTS.md` — `src/` architecture: Chrome worlds, build, popup messaging, frame coordinator.
- `../firefox-compatibility-issues.md` — what blocks a Firefox port.
- `../tutorials/` — interactive explainers for concepts the extension uses (anchor positioning, leader coordination); run with `npm run tutorials`.
- `../.claude/skills/sync-upstream/SKILL.md` — how to sync upstream commits.

## Upstream bookmarks

Upstream work we skipped but may want later, in `upstream-bookmarks/`:

- `26cbf2d-speed-arbitration.md` — formal speed-conflict state machine; also the known endless-revert risk. Read first for speed fights or stutter.
- `ec11ba4-visibility-refactor.md` — controller visibility refactor. Read for show/hide/flash bugs.
- `10e7de2-positioning-model.md` — CSS-only two-layer positioning. Read for controller placement bugs.
- `bd44168-user-editable-css.md` — user-editable controller CSS in options.
- `c66fc3d-release-infrastructure.md` — release build, packaging, and pre-push hooks.
