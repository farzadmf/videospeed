const FLASH_MS = 450;
const FLASH_BG = '#eab308';

// Per-element flash state so rapid re-flashes restore the true original
// background, not a half-faded flash color captured mid-flash.
const flashing = new WeakMap();

/**
 * Briefly fill an element's background, then restore its inline style. Used to
 * show that a routed key landed on this controller. Filling the inside is more
 * visible than an outline, which can blend into whatever sits behind the pill.
 */
export function flashElement(el) {
  if (!el) {
    return;
  }

  const existing = flashing.get(el);
  if (existing) {
    // Already flashing: cancel the pending restore, keep the true original.
    clearTimeout(existing.timer);
  }

  const prevBg = existing ? existing.prevBg : el.style.background;

  el.style.background = FLASH_BG;

  const timer = setTimeout(() => {
    el.style.background = prevBg;
    flashing.delete(el);
  }, FLASH_MS);

  flashing.set(el, { prevBg, timer });
}
