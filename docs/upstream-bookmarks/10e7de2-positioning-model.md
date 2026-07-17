# Upstream Positioning Model — 10e7de2, c0b1a35, 8a0876d

Upstream commits:

- Plan: https://github.com/igrigorik/videospeed/commit/c0b1a35
- Fix: https://github.com/igrigorik/videospeed/commit/10e7de2
- Merge: https://github.com/igrigorik/videospeed/commit/8a0876d

## Why this is bookmarked

Our project uses scroll-based JS positioning. We've been considering whether a CSS-only approach could replace it. Upstream's two-layer positioning model is a well-documented CSS-only approach worth studying.

## Upstream's two-layer CSS positioning model

```
LIGHT DOM (inject.css)              SHADOW DOM (shadow CSS + inline)
┌────────────────────────┐         ┌──────────────────────────┐
│ <vsc-controller>       │         │ #controller              │
│                        │         │                          │
│ Inline: z-index ONLY   │────────>│ Inline: top, left        │
│ CSS: position:absolute │         │ CSS: position:absolute   │
│   (or relative via     │         │                          │
│    site override)      │         │ Drag modifies top/left   │
└────────────────────────┘         └──────────────────────────┘
```

### Key rules

1. **Wrapper inline styles: z-index ONLY.** No position, top, or left. Adding inline position defeats CSS site overrides via specificity.

2. **Wrapper position is CSS-controlled:**
   - Default: `position: absolute` in inject.css (no `!important`)
   - Site overrides: `position: relative` with top/left nudge (higher specificity class+element selector wins over bare element)

3. **Inner #controller position:**
   - Shadow CSS: `position: absolute`
   - Inline top/left: computed by `calculatePosition()` for generic sites, or (0,0) when a CSS override sets wrapper to relative

4. **Position calculation happens AFTER DOM insertion:**
   - Insert wrapper into DOM first
   - Check `getComputedStyle(wrapper).position`
   - If not relative → run `calculatePosition()`, set on inner #controller
   - If relative → CSS override is active, inner stays at (0,0)

### Why CSS for site overrides (not JS)

- Declarative: one line of CSS vs a full JS handler
- Separation of concerns: handlers own WHERE (insertion point), CSS owns HOW (visual positioning)
- Contributor-friendly: can be prototyped in devtools, then committed

### Site-specific CSS overrides in inject.css

```css
/* Default: absolute, out of flow */
vsc-controller {
  position: absolute;
}

/* YouTube main: relative with offset */
.html5-video-player vsc-controller {
  position: relative;
  top: 10px;
}

/* YouTube embedded: same offset */
#player > vsc-controller {
  position: relative;
  top: 60px;
}

/* Netflix, Facebook, Google Photos, etc: relative with site-specific nudge */
.watch-video vsc-controller {
  position: relative;
  top: 0;
  left: 0;
}
```

Higher specificity (class+element) beats the bare `vsc-controller` rule.

### Known limitations

- `calculatePosition()` computes relative to `video.offsetParent`, but inner #controller positions relative to wrapper's containing block. These match when wrapper is near the video (true for most cases).
- Same-origin iframes: CSS injected via dynamic `<link>` loads async. If controller is created before CSS loads, `getComputedStyle` returns wrong position.

## Relevance to our project

If we want to move from scroll-based JS positioning to CSS-only:

- The two-layer model (wrapper = CSS positioning, inner = computed offset) is a clean separation
- Site overrides via CSS specificity are simpler than per-site JS handlers
- The "insert first, then check computed style" pattern avoids the offsetParent mismatch problem
- We'd need to audit our site handlers to see which could become pure CSS overrides vs which need JS insertion logic
