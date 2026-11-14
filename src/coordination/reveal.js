/**
 * Scroll a video into view through every frame above it.
 *
 * A frame can scroll only its own document, and only a direct parent can find the
 * `<iframe>` of a child that asks, by `contentWindow === event.source`. So each frame
 * scrolls its part and asks its parent to do the same, up to the top frame.
 */
import { logger } from '../utils/logger.js';
import { COORD_MSG, makeMessage, parseMessage } from './messages.js';

const LOG = '[VSC-REVEAL]';

/**
 * @param {Document|ShadowRoot} root
 * @param {MessageEventSource} source
 * @returns {HTMLIFrameElement|HTMLFrameElement|null} the frame element that holds source
 */
export function findFrameElement(root, source) {
  for (const element of root.querySelectorAll('*')) {
    if ((element.tagName === 'IFRAME' || element.tagName === 'FRAME') && element.contentWindow === source) {
      return element;
    }

    const found = element.shadowRoot && findFrameElement(element.shadowRoot, source);
    if (found) {
      return found;
    }
  }

  return null;
}

/**
 * @param {{bottom: number, left: number, right: number, top: number}} rect
 * @returns {boolean} true when rect is fully inside this frame's viewport
 */
function isInViewport(rect) {
  return rect.top >= 0 && rect.left >= 0 && rect.bottom <= window.innerHeight && rect.right <= window.innerWidth;
}

/**
 * @param {DOMRect} rect
 * @returns {{bottom: number, left: number, right: number, top: number}} a rect postMessage can clone
 */
function plainRect({ bottom, left, right, top }) {
  return { bottom, left, right, top };
}

/** @param {{bottom: number, left: number, right: number, top: number}} rect - in this frame's viewport */
function askParent(rect) {
  if (window === window.top) {
    return;
  }

  // '*' because the parent is often cross-origin; the payload is only a rect.
  window.parent.postMessage(makeMessage(COORD_MSG.REVEAL, { rect }), '*');
}

/** @param {Element} element - scrolled to the center of the viewport */
export function revealElement(element) {
  element.scrollIntoView({ block: 'center', inline: 'nearest' });
  askParent(plainRect(element.getBoundingClientRect()));
}

/**
 * Resolves once half of element shows, or after timeoutMs. The frames above it scroll
 * after this frame does, one message per level, so the element is not in view at once.
 * @param {Element} element
 * @param {number} timeoutMs - For an element too large to ever show by half
 * @returns {Promise<void>}
 */
export function whenInView(element, timeoutMs) {
  return new Promise((resolve) => {
    const done = () => {
      observer.disconnect();
      clearTimeout(timer);
      resolve();
    };

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.intersectionRatio >= 0.5)) {
          done();
        }
      },
      { threshold: 0.5 }
    );
    const timer = setTimeout(done, timeoutMs);
    observer.observe(element);
  });
}

/**
 * A child frame asks to show `rect`, given in the child's viewport.
 * @param {MessageEvent} event
 */
function onRevealRequest(event) {
  const msg = parseMessage(event.data);
  if (msg?.type !== COORD_MSG.REVEAL || !event.source) {
    return;
  }

  const frame = findFrameElement(document, event.source);
  if (!frame) {
    logger.debug(`${LOG} no frame element for the asking window`);
    return;
  }

  // The child's own scroll can already scroll this frame, so move only when the video
  // is still out of view. Centering the whole frame can push a video near the edge of a
  // tall frame out of view.
  const toTarget = () => {
    const box = frame.getBoundingClientRect();
    const { rect } = msg.payload;
    const top = box.top + frame.clientTop;
    const left = box.left + frame.clientLeft;
    return { bottom: top + rect.bottom, left: left + rect.left, right: left + rect.right, top: top + rect.top };
  };

  if (!isInViewport(toTarget())) {
    frame.scrollIntoView({ block: 'center', inline: 'nearest' });
  }

  askParent(toTarget());
}

/** Relay reveal requests from child frames. Runs in every frame, even one with no videos. */
export function installRevealRelay() {
  window.addEventListener('message', onRevealRequest, false);
}
