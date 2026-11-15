# Proposal

## Why

The controller host sits in `document.body` (or the video's shadow root) with `position: fixed` and `z-index: 9999`, so page menus that cover the video do not cover the pill, and scroll containers do not clip it. Anchor positioning places the pill on the video wherever the host is, so the host can move next to the video without upstream's per-site rules.

## What Changes

- New option **Controller inside the player**, on by default, needs anchor positioning.
- With it on, one generic rule finds the video's player box; the host goes in as its last child with `position: absolute`, and a z-index just above the box's own layers.
- Shadow DOM: the walk stays in the video's tree, copies slot names, and falls back to today's placement where the host would not render.
- A removed host comes back.
- The test page's scroll container gets `position: relative`, like real players.

## Capabilities

### New Capabilities

- `controller-placement`: where the controller host goes, and how it stacks, clips, and survives page changes.

### Modified Capabilities

None.

## Impact

- `src/core/video-controller.js`, `src/ui/shadow-dom-manager.js`, `src/ui/flash-ring.js`, a new `src/ui/` module.
- The option: `src/shared/defaults.js`, `src/core/config.js`, `other-settings.tsx`.
- `tests/manual/multi-video/index.html`.
