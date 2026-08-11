---
name: sync-upstream
description: Sync commits from upstream (igrigorik/videospeed) into this fork, one local commit per upstream commit, conceptually integrated rather than git-applied. Use when the user asks to sync, pull in, or catch up on upstream changes.
---

# Sync upstream changes

This is a heavily modified fork. Upstream commits cannot be `git apply`-ed: line numbers, variable names, and logic differ. Every change is integrated conceptually, guarding existing code flow above all.

## Absolute rule

Under NO circumstances do you decide on your own that a commit is unimportant, skippable, or "small enough" that you already know what to do. You NEVER skip discussion. The user decides what gets skipped — you only propose, with justification, and wait for confirmation.

Even a commit you're confident is not applicable still gets a tracking commit on our side (empty commit, with a note on why).

## Your role

1. **Cover the full range.** Read every commit that needs syncing, in order. Understand each one against our corresponding code. Later commits inform earlier ones — e.g. an early commit adds a bug that a later commit fixes, so the early change may be moot, yet it still gets its tracking commit.

2. **Explain each commit** to the user: what it is and how it applies to our code. Rules for the explanation:
   - Maximum 150 words. Plainest possible words. No word vomit.
   - Do NOT mention non-applicable machinery at all (tests, upstream's global-namespace modules, etc.) — the user knows these don't apply here.

3. **Confirm before applying.** Never apply until the user agrees.

4. **Batch the likely-skippable.** Group commits you believe can be skipped and ask about them together in one message. Give a per-commit justification, maximum 30 words each. Still the user's call.

## Setup

You need the path to a local clone of upstream. If the user didn't provide it, **stop and ask before doing anything else.** Then `git pull` it so it's current.

## Find the starting point

- Find our most recent commit whose title contains `[UPSTREAM]`.
- Its message references the short SHA of the last-synced upstream commit.
- Sync every upstream commit after that one.

## Per-commit workflow

1. If the upstream commit links a design doc, read it to understand the underlying motivation.
2. Integrate conceptually — bug fixes and features are welcome, but existing code flow must not break.
3. One local commit per upstream commit.

## Commit conventions

- Conventional commit format; title matches the upstream title and contains `[UPSTREAM]`.
- Link the upstream commit in the body. Model the message after our commit `16ef4e8b2`.
- Non-applicable commits get an empty tracking commit with a short note on why. Empty commits are required for every non-dependency commit we don't take.

## Special cases

- **Dependency-only bumps:** ignore. But if dependencies are added or removed, stop and work out how to proceed.
- **Merge commits:** process the underlying individual commits, not the merge. If several, squash into one local commit and note the squash in the body.
- **Settings migrations:** we don't want them — wipe settings and start fresh instead. Tell the user a change may require deleting settings.

## After applying

Re-read every change to confirm it's sane, nothing existing broke, and compare against upstream a second time to catch anything applicable you missed.
