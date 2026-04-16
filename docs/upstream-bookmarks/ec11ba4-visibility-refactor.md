# Upstream Visibility Refactor — ec11ba4

Upstream commit: https://github.com/igrigorik/videospeed/commit/ec11ba4

## Why this is bookmarked

This commit refactors the controller visibility system. Not directly applicable
because our visibility/positioning approach is fundamentally different, but
contains useful insights for when we revisit our own visibility logic.

## Key problems fixed upstream

1. **Dual-timer race**: `showController` (EventManager, 2000ms) and `blinkController`
   (ActionHandler, 2500ms) both add `vsc-show` with independent timers. Speed change
   triggers BOTH — the shorter timer fires first and removes `vsc-show`, making the
   controller vanish early. We likely have this same issue.

2. **vsc-manual write-only**: Once user toggles display, `vsc-manual` is permanently
   set, changing behavior for the lifetime of the page. No way to return to automatic
   behavior. We may have this too.

3. **YouTube autohide vs shadow DOM**: Light DOM CSS rules targeting `.ytp-autohide`
   don't affect shadow DOM content. Upstream moved to class forwarding via
   MutationObserver in YouTubeHandler.

4. **Redundant showController calls**: Every speed change called showController twice
   (adjustSpeed → showController, then setSpeed → blinkController).

## Upstream solution summary

- Single `flashController()` replaces both `showController` and `blinkController`
- Per-controller `flashTimer` (no more global timer shared across controllers)
- `startHidden` guard: flash refused when startHidden=true and no vsc-manual
- `vsc-manual` cleared when startHidden=false (returns to automatic behavior)
- YouTube autohide: YouTubeHandler observes `.ytp-autohide` and forwards as
  `vsc-autohide` class on the host element
- Shadow DOM CSS is sole visibility authority (light DOM CSS only does positioning)

## CSS class system (upstream)

| Class         | Meaning                                    |
|---------------|--------------------------------------------|
| vsc-hidden    | Persistent hide (startHidden, display action) |
| vsc-show      | Temporary flash (flashController, timer-managed) |
| vsc-manual    | User has toggled this controller           |
| vsc-nosource  | Video has no src                           |
| vsc-autohide  | YouTube player controls hidden             |

## Follow-up fix: d96ea5a — rewrite flash guards, remove autohide override

Upstream commit: https://github.com/igrigorik/videospeed/commit/d96ea5a

Fixes broken guards in `flashController` (introduced in ec11ba4). The old
guards conflated startHidden with "no user interaction yet":
- `startHidden && !vsc-manual` blocked flash for startHidden=false (no
  vsc-manual set yet) and allowed flash for startHidden=true after V toggle.

New guards:
1. `startHidden` → hard stop, never flash
2. `vsc-manual && vsc-hidden` → user V-hid, respect that
3. else → flash

Also removes `:host(.vsc-manual:not(.vsc-hidden))` CSS rule from shadow-dom.js
— V-show should return to default autohide behavior, not pin visible.

**Relevance to us**: Our `showController` in `event-manager.js` has the same
broken guard pattern: `startHidden && !controller.classList.contains('vsc-manual')`.
When we revisit our visibility model, this should be fixed using upstream's
simplified logic as a reference.

## Files changed upstream (ec11ba4)

- `src/core/action-handler.js` — blinkController → flashController
- `src/utils/event-manager.js` — showController removed
- `src/ui/shadow-dom.js` — CSS rules for visibility classes
- `src/site-handlers/youtube-handler.js` — autohide class forwarding
- `src/styles/inject.css` — YouTube visibility rules removed
- `src/utils/debug-helper.js` — updated for new class names

## Files changed upstream (d96ea5a)

- `src/core/action-handler.js` — flashController guard rewrite
- `src/ui/shadow-dom.js` — remove vsc-manual:not(vsc-hidden) CSS override
