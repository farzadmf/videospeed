# Upstream User-Editable Controller CSS — bd44168

Upstream commit: https://github.com/igrigorik/videospeed/commit/bd44168

## Why this is bookmarked

Adds user-editable CSS for controller positioning via Options > Advanced.
Not applicable because our positioning is scroll-based JS, but the concept
of letting users fix site-specific issues via custom CSS is worth considering
if we move to a CSS-based positioning model.

## What it does

- Moves site-specific positioning rules from inject.css into a `controllerCSS`
  setting stored in chrome.storage.sync
- CSS textarea in options page (Advanced section) with live validation
- Injected as `<style id="vsc-controller-css">` from content-entry.js BEFORE
  inject.js loads (guarantees CSS exists before controllers are created)
- Live updates via chrome.storage.onChanged — no page reload needed
- Defaults ship rules for YouTube, Netflix, Facebook, Google Photos, Google
  Drive, ChatGPT, OpenAI, Amazon Prime Video

## Key architecture decisions

- CSS injected from content-entry.js (not inject.js) for timing safety
- Domain matching via `--vsc-domain` CSS custom property on `:root`
  (not data attributes, which cause React hydration errors)
- Validation: CSSStyleSheet.replaceSync() for syntax, rule count comparison
  for silently dropped rules, 8KB size limit
- New shared module `controller-css-defaults.js` as single source of truth

## Files changed

- `src/entries/content-entry.js` — CSS injection + live update listener
- `src/content/inject.js` — iframe CSS injection
- `src/styles/inject.css` — stripped to base rule only
- `src/styles/controller-css-defaults.js` — default CSS rules
- `src/ui/options/` — textarea, validation, save/restore
- `src/core/settings.js` — controllerCSS field
- `src/utils/constants.js` — DEFAULT_CONTROLLER_CSS reference
