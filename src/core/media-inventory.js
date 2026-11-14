/**
 * Reports this frame's controlled videos to the popup while its port is open.
 *
 * Each frame reports only its own videos; the popup merges the frames. Reports are
 * whole snapshots rather than deltas, which removes any ordering or lost-message
 * problem, and a frame holds few videos so a snapshot stays small.
 */
import { logger } from '../utils/logger.js';
import { stateManager } from './state-manager.js';

const DEBOUNCE_MS = 100;
const HEARTBEAT_MS = 1000;

// A frame cannot read its own Chrome frameId, so it makes its own id. Generated once
// per frame load, so it stays the same while the popup opens and closes.
const FRAME_TOKEN = Math.random().toString(36).slice(2, 10);

// Playback changes the popup shows. Media events do not cross a shadow boundary, so
// these are bound per video rather than once on the document.
const VIDEO_EVENTS = ['play', 'pause', 'ratechange'];

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
  }

  start() {
    if (this.running) {
      return;
    }
    this.running = true;

    this.unsubscribe = stateManager.subscribeControllersChanged(() => {
      this.bindVideoEvents();
      this.scheduleReport();
    });

    this.heartbeatTimer = setInterval(() => this.report(), HEARTBEAT_MS);

    this.bindVideoEvents();
    this.report();

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

    logger.debug(`[inventory] stopped for frame ${FRAME_TOKEN}`);
  }

  /**
   * Rebind the playback listeners to the current videos. One AbortController per bind
   * drops the old listeners in one call, so a video that went away leaves nothing behind.
   * @private
   */
  bindVideoEvents() {
    this.videoEventAbort?.abort();

    if (!this.running) {
      return;
    }

    this.videoEventAbort = new AbortController();
    const { signal } = this.videoEventAbort;

    for (const { video } of stateManager.getControllerEntries()) {
      for (const type of VIDEO_EVENTS) {
        video.addEventListener(type, () => this.scheduleReport(), { signal });
      }
    }
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

  /** @returns {Object} this frame's videos */
  snapshot() {
    const entries = stateManager.getControllerEntries().map(({ controllerId, video }) => ({
      id: `${FRAME_TOKEN}:${controllerId}`,
      playing: !video.paused,
      speed: video.playbackRate,
    }));

    return {
      entries,
      frameToken: FRAME_TOKEN,
      isTop: window === window.top,
      url: location.href,
    };
  }
}
