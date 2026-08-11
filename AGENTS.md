## Coding style

See @docs/coding-style.md for conventions beyond the linter — notably using blank lines to group code into readable "paragraphs", and when to comment.

## Overview

This project is a heavily modified fork of https://github.com/igrigorik/videospeed, but tries to keep all the existing functionality/fixes of upstream. Some of upstream changes may not be applicable to this project because of the fundamental differences made on purpose.

## Upstream bookmarks

Some upstream commits aren't directly applicable but contain useful insights for future work. These are documented in `docs/upstream-bookmarks/`:

- `ec11ba4-visibility-refactor.md` — Controller visibility system refactor (dual-timer race fix, vsc-manual cleanup, YouTube autohide). Relevant when we revisit our own visibility logic.
- `10e7de2-positioning-model.md` — Two-layer CSS positioning model (wrapper=CSS, inner=computed). Relevant if we want to replace our scroll-based JS positioning with a CSS-only approach.
- `bd44168-user-editable-css.md` — User-editable controller CSS via options page. Relevant if we adopt CSS-based positioning and want users to fix site-specific issues themselves.

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

To sync upstream changes into this fork, use the `sync-upstream` skill (`.claude/skills/sync-upstream/SKILL.md`). It carries the full workflow: finding the last-synced commit, the per-commit confirm-before-applying loop, commit conventions, and special cases.
