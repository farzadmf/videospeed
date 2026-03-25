## Overview

This project is a heavily modified fork of https://github.com/igrigorik/videospeed, but tries to keep all the existing functionality/fixes of upstream. Some of upstream changes may not be applicable to this project because of the fundamental differences made on purpose.

## Upstream bookmarks

Some upstream commits aren't directly applicable but contain useful insights for future work. These are documented in `docs/upstream-bookmarks/`:

- `ec11ba4-visibility-refactor.md` — Controller visibility system refactor (dual-timer race fix, vsc-manual cleanup, YouTube autohide). Relevant when we revisit our own visibility logic.

## File structure

Project almost has 1-1 parity with upstream, with these notable differences:

- Upstream assigns modules to global namespace, but we use exploit `esbuild` ES module imports.
- We have some 3rd party dependencies bundled in ./src/assets/pkgs
- We have a ./src/shared that upstream does NOT have, where we consolidate lots of constants, settings, etc.
- We define styles in ./src/styles and inject them into the Web page, but upstream puts those styles as templated strings in JS code and uses them.
- Our ./src/ui/shadow-dom-manager.js is ./src/ui/shadow-dom.js in upstream
- Our ./src/ui/controls-manager.js is ./src/ui/controls.js in upstream
- Our ./src/ui/element.js is ./src/ui/vsc-controller-element.js in upstream
- Upstream is lacking our ./src/utils/misc.js and ./src/utils/url.js
- As mentioned above, our constants are in the ./src/shared folder and we don't utilize ./src/utils/constants.js, but we've kept it for posterity

## Functional changes

The BIG difference in our project is to provide a lot more control over the video. To name a few:

- Direct binding for pre-defined speeds.
- Properly remembering speed for Websites.
- Provide a richer UI with a lot more information (admittedly, it does look more bloated, but we need to lose something to gain something)
- Instead of relying solely on CSS to position the video speed controller, our project listens on scroll events to make sure controller follows the video position.
- Our speed saving/syncing may be quite different than upstream, and upstream changes have may break our logic, so extra attention and care should be put on that.
- Since we're using ES imports, we can use the `logger` almost anywhere in the code, so we strive to use that as much as possible and avoid `console` calls unless they happen in a context where we cannot import that `logger` module.
- And ... other differences.

## Tests

Upstream tests do NOT work in our project - mainly because of upstream injecting modules in global namespace but us using ES module imports and probably other fundamental differences/behavior changes. That being said, we "copy/paste" upstream tests folder as a reference in case we want to look into it.

## Syncing upstream changes

As a result of what mentioned above, when we're planning to sync upstream changes with this repo, we should keep in mind:

- Some changes might not be even applicable in our project because of the decision to have functionally different behaviors.
- It's possible that a bug fix in upstream has already been taken care of in this project, which means the change is not necessary, otherwise, we DO need the change.
- Because of changes mentioned above, special consideration needs to be present to make sure the change is properly incorporated into this project's existing code - When applying a change, some things might be different: line numbers containing the change, variable names, and possibly logic, so the change CANNOT be "git applied", but should be conceptually integrated into the code.
- In cases where we don't take upstream change or take part of it, it'd be nice to include a tiny comment, noting what/why we didn't pick.
- When applying upstream changes, we should have single git commits corresponding to each commit upstream, while:
  - Following conventional commit format.
  - Commit title matches upstream title.
  - We should include the word `[UPSTREAM]` in the commit title.
  - Include a link to upstream commit in the commit message.
  - An example would be our commit message for commit hash `16ef4e8b2`.
- To know which upstream commit we need to start syncing, we do:
  - Find the most recent commit having the word `[UPSTREAM]` in it.
  - In its commit message, it would have the short version of upstream commit SHA.
  - That means that commit is the last synced one, and we should continue after that.
- Under no circumstances, we're allowed to skip a commit unless confirmed with the user.
- If we confirm and decide that a commit is not applicable at all, not even partially, we can do an empty commit with proper title and including small notes on why we decided that it's not applicable.
- NOTE: empty commits ARE required for non-dependency-only commits/changes.
- If an upstream commit is _only_ about dependency version upgrade, we can ignore it (NOTE: if dependencies are added/removed, we need to see how to proceed).

In a nutshell, THE MOST important thing when applying upstream changes:

- We MUST COMPLETELY understand our logic AND COMPLETELY understand upstream change.
- We MUST make sure our logic won't break - bug fixes and new features are fine, but we MUST pay extra attention to existing code flow.

After applying the changes, we MUST re-read all the changes to:

- Make sure they're sane and applicable to our code.
- Make sure we didn't mess up any existing in the process.
- Compare with upstream for a second time to make sure we got everything that's applicable to our code.
