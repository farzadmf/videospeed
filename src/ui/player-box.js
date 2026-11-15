/**
 * Where the controller goes when it sits inside the video's player.
 *
 * Players wrap their video and its overlays in a box of about the video's size; that
 * box is also what clips the player and goes fullscreen. So the controller goes in
 * the highest ancestor that is still about the video's size, found from size alone,
 * with no per-site rules.
 */
import { logger } from '../utils/logger.js';

// Leaves room for a control bar under the video, not for a page section.
const MAX_AREA_RATIO = 1.5;
const TOLERANCE_PX = 2;
const MAX_Z_INDEX = 2147483646;

function area(rect) {
  return rect.width * rect.height;
}

function containsRect(outer, inner) {
  return (
    outer.left <= inner.left + TOLERANCE_PX &&
    outer.top <= inner.top + TOLERANCE_PX &&
    outer.right >= inner.right - TOLERANCE_PX &&
    outer.bottom >= inner.bottom - TOLERANCE_PX
  );
}

/**
 * @param {HTMLMediaElement} video
 * @returns {Element|ShadowRoot} the player box. It stays in the video's tree, because
 *   anchor names are tree-scoped, and stops at `<body>`.
 */
function findPlayerBox(video) {
  // A video at the top of a shadow root has no parent element; the root holds it.
  let box = video.parentElement ?? video.parentNode;

  const videoRect = video.getBoundingClientRect();
  const videoArea = area(videoRect);
  if (videoArea === 0 || !(box instanceof Element)) {
    return box;
  }

  for (let next = box.parentElement; next && box !== document.body; next = next.parentElement) {
    const rect = next.getBoundingClientRect();
    if (!containsRect(rect, videoRect) || area(rect) > videoArea * MAX_AREA_RATIO) {
      break;
    }
    box = next;
  }

  return box;
}

/**
 * A light child of a shadow host renders only through a slot: take the slot of the
 * box's child that leads to the video, so the controller lands where the video does.
 * @returns {string|null}
 */
function slotFor(box, video) {
  if (!(box instanceof Element) || !box.shadowRoot) {
    return null;
  }

  let child = video;
  while (child.parentElement && child.parentElement !== box) {
    child = child.parentElement;
  }

  return child.getAttribute('slot');
}

/**
 * Whether an element added at this place gets a layout box. A closed shadow root, or a
 * custom element that draws none of its light children, would hide it.
 */
function rendersHere(box, slot) {
  const probe = document.createElement('vsc-probe');
  probe.style.cssText = 'display: block; height: 1px; position: absolute; width: 1px;';
  if (slot) {
    probe.slot = slot;
  }

  box.appendChild(probe);
  const renders = probe.getClientRects().length > 0;
  probe.remove();

  return renders;
}

/** @returns {number} one above the highest z-index inside box, so the player's layers stay below */
function zIndexAbove(box) {
  let highest = 0;
  for (const element of box.querySelectorAll('*')) {
    const z = Number.parseInt(getComputedStyle(element).zIndex, 10);
    if (Number.isFinite(z) && z > highest) {
      highest = z;
    }
  }

  return Math.min(highest + 1, MAX_Z_INDEX);
}

function describe(node) {
  if (node instanceof ShadowRoot) {
    return `#shadow-root of <${node.host.localName}>`;
  }
  const id = node.id ? `#${node.id}` : '';
  const cls = node.classList?.length ? `.${[...node.classList].join('.')}` : '';
  return `<${node.localName}${id}${cls}>`;
}

/**
 * @param {HTMLMediaElement} video
 * @returns {{box: Element|ShadowRoot, slot: string|null, zIndex: number}|null} where to put
 *   the controller, or null when no place inside the player renders it
 */
export function placeInPlayer(video) {
  const box = findPlayerBox(video);
  if (!box) {
    return null;
  }

  const slot = slotFor(box, video);
  if (!rendersHere(box, slot)) {
    logger.debug(`[placement] ${describe(box)} does not render added children; using the page root`);
    return null;
  }

  const zIndex = zIndexAbove(box);
  logger.debug(`[placement] box=${describe(box)} slot=${slot ?? '-'} z-index=${zIndex}`);

  return { box, slot, zIndex };
}
