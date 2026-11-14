/**
 * Reports this frame's controlled videos to the popup while its port is open.
 *
 * Each frame reports only its own videos; the popup merges the frames. Reports are
 * whole snapshots rather than deltas, which removes any ordering or lost-message
 * problem, and a frame holds few videos so a snapshot stays small.
 */
import { INVENTORY_KIND } from '../shared/constants.js';
import { logger } from '../utils/logger.js';
import { stateManager } from './state-manager.js';

const DEBOUNCE_MS = 100;
const HEARTBEAT_MS = 1000;

// A video counts as in view from this share of its area. Thresholds below it only
// make visible area finer for choosing the most visible video.
const IN_VIEW_RATIO = 0.1;
const VISIBILITY_THRESHOLDS = [0, IN_VIEW_RATIO, 0.25, 0.5, 0.75, 1];

// A frame cannot read its own Chrome frameId, so it makes its own id. Generated once
// per frame load, so it stays the same while the popup opens and closes.
const FRAME_TOKEN = Math.random().toString(36).slice(2, 10);

// Playback changes the popup shows. Media events do not cross a shadow boundary, so
// these are bound per video rather than once on the document.
const VIDEO_EVENTS = ['play', 'pause', 'ratechange'];

/**
 * The chain from an element out to the document: the element, then the host of each
 * shadow root it sits in. The last item is in the document tree.
 * @param {Element} element
 * @returns {Element[]}
 */
function hostChain(element) {
  const chain = [element];

  let root = element.getRootNode();
  while (root instanceof ShadowRoot) {
    chain.push(root.host);
    root = root.host.getRootNode();
  }

  return chain;
}

/**
 * Sort order across shadow roots. compareDocumentPosition alone reports elements in
 * different trees as disconnected, so this compares at the outermost tree where the
 * two chains diverge, where both elements share a root.
 * @returns {number}
 */
function compareFlatTreeOrder(a, b) {
  const chainA = hostChain(a);
  const chainB = hostChain(b);

  let i = chainA.length - 1;
  let j = chainB.length - 1;
  while (i >= 0 && j >= 0 && chainA[i] === chainB[j]) {
    i -= 1;
    j -= 1;
  }

  if (i < 0 && j < 0) {
    return 0;
  }

  // One element contains the other's shadow tree: the host comes first.
  if (i < 0 || j < 0) {
    return i < 0 ? -1 : 1;
  }

  return chainA[i].compareDocumentPosition(chainB[j]) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
}

/**
 * A label the page provides, or '' so the popup can fall back to a position.
 * @param {HTMLMediaElement} video
 * @param {boolean} onlyVideoInFrame
 * @returns {string}
 */
function labelFor(video, onlyVideoInFrame) {
  const own = (video.getAttribute('title') || video.getAttribute('aria-label') || '').trim();
  if (own) {
    return own;
  }

  const caption = video.closest('figure')?.querySelector('figcaption')?.textContent?.trim();
  if (caption) {
    return caption;
  }

  // An embedded player's frame usually exists for that one video and carries its name.
  if (window !== window.top && onlyVideoInFrame) {
    return document.title.trim();
  }

  return '';
}

/**
 * The video a popup command names, when this frame owns it. Every frame receives every
 * command on the shared port, so a target from another frame is not this frame's to act on.
 * @param {string} target - `<frameToken>:<controllerId>`
 * @returns {{mine: false} | {mine: true, video: HTMLMediaElement|null}}
 */
export function resolveTarget(target) {
  const split = target.indexOf(':');
  if (split < 0 || target.slice(0, split) !== FRAME_TOKEN) {
    return { mine: false };
  }

  return { mine: true, video: stateManager.getMediaByControllerId(target.slice(split + 1)) };
}

export class MediaInventory {
  /**
   * @param {Object} options
   * @param {(snapshot: Object) => void} options.send - Hands a snapshot to the bridge
   */
  constructor({ send }) {
    this.send = send;
    this.running = false;

    this.debounceTimer = null;
    this.heartbeatTimer = null;
    this.unsubscribe = null;
    this.videoEventAbort = null;

    this.visibilityObserver = null;
    /** @type {WeakMap<HTMLMediaElement, {area: number, ratio: number}>} */
    this.visibility = new WeakMap();
  }

  start() {
    if (this.running) {
      return;
    }
    this.running = true;

    // With the implicit root, the browser measures against the top-level viewport and
    // applies the clipping of every ancestor scroller and frame, cross-origin too.
    this.visibilityObserver = new IntersectionObserver((entries) => this.onVisibility(entries), {
      threshold: VISIBILITY_THRESHOLDS,
    });

    this.unsubscribe = stateManager.subscribeControllersChanged(() => {
      this.bindVideos();
      this.scheduleReport();
    });

    this.heartbeatTimer = setInterval(() => this.report(), HEARTBEAT_MS);

    this.bindVideos();

    // With videos, the first report waits for the observer's first measurement, which
    // it delivers for every observed video. Sending now would report them all off-screen.
    if (stateManager.getControllerEntries().length === 0) {
      this.report();
    }

    logger.debug(`[inventory] started for frame ${FRAME_TOKEN}`);
  }

  stop() {
    if (!this.running) {
      return;
    }
    this.running = false;

    clearTimeout(this.debounceTimer);
    clearInterval(this.heartbeatTimer);
    this.debounceTimer = null;
    this.heartbeatTimer = null;

    this.unsubscribe?.();
    this.unsubscribe = null;

    this.videoEventAbort?.abort();
    this.videoEventAbort = null;

    this.visibilityObserver?.disconnect();
    this.visibilityObserver = null;

    logger.debug(`[inventory] stopped for frame ${FRAME_TOKEN}`);
  }

  /**
   * Rebind listeners and the visibility observer to the current videos. One
   * AbortController per bind drops the old listeners in one call, so a video that
   * went away leaves nothing behind.
   * @private
   */
  bindVideos() {
    this.videoEventAbort?.abort();
    this.visibilityObserver?.disconnect();

    if (!this.running) {
      return;
    }

    this.videoEventAbort = new AbortController();
    const { signal } = this.videoEventAbort;

    for (const { video } of stateManager.getControllerEntries()) {
      for (const type of VIDEO_EVENTS) {
        video.addEventListener(type, () => this.scheduleReport(), { signal });
      }
      this.visibilityObserver.observe(video);
    }
  }

  /** @private */
  onVisibility(entries) {
    for (const entry of entries) {
      const { height, width } = entry.intersectionRect;
      this.visibility.set(entry.target, { area: Math.round(width * height), ratio: entry.intersectionRatio });
    }

    this.scheduleReport();
  }

  /** Coalesce a burst of changes into one snapshot. */
  scheduleReport() {
    if (!this.running || this.debounceTimer) {
      return;
    }

    this.debounceTimer = setTimeout(() => {
      this.debounceTimer = null;
      this.report();
    }, DEBOUNCE_MS);
  }

  report() {
    if (!this.running) {
      return;
    }

    try {
      this.send(this.snapshot());
    } catch (error) {
      logger.warn(`[inventory] failed to report: ${error.message}`);
    }
  }

  /** @returns {Object} this frame's videos, in flat-tree document order */
  snapshot() {
    const controlled = stateManager.getControllerEntries();
    controlled.sort((a, b) => compareFlatTreeOrder(a.video, b.video));

    const onlyVideoInFrame = controlled.length === 1;

    const entries = controlled.map(({ controllerId, video }) => {
      // Not yet measured counts as out of view, which the first callback corrects.
      const { area, ratio } = this.visibility.get(video) ?? { area: 0, ratio: 0 };

      return {
        id: `${FRAME_TOKEN}:${controllerId}`,
        inView: ratio >= IN_VIEW_RATIO,
        label: labelFor(video, onlyVideoInFrame),
        playing: !video.paused,
        speed: video.playbackRate,
        visibleArea: area,
      };
    });

    return {
      entries,
      frameToken: FRAME_TOKEN,
      isTop: window === window.top,
      kind: INVENTORY_KIND.SNAPSHOT,
      url: location.href,
    };
  }

  /**
   * Tell the popup how a command it sent turned out.
   * @param {Object} result
   * @param {{name: string, value?: number}} result.action - The action the popup sent
   * @param {number} result.commandId - The id the popup sent with the command
   * @param {'applied'|'refused'|'unknown-target'} result.outcome
   * @param {string} result.target - The video id the popup sent
   */
  sendOutcome({ action, commandId, outcome, target }) {
    this.send({ action, commandId, kind: INVENTORY_KIND.OUTCOME, outcome, target });
  }
}
