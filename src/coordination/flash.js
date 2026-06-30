const FLASH_MS = 450;
const FLASH_BG = '#eab308';

/**
 * Briefly fill an element's background, then restore its inline style. Used to
 * show that a routed key landed on this controller. Filling the inside is more
 * visible than an outline, which can blend into whatever sits behind the pill.
 */
export function flashElement(el) {
  if (!el) {
    return;
  }

  const prevBg = el.style.background;

  el.style.background = FLASH_BG;

  setTimeout(() => {
    el.style.background = prevBg;
  }, FLASH_MS);
}
