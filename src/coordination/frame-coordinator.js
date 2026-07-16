/**
 * Cross-frame controller registry.
 *
 * With `all_frames: true`, each cross-origin iframe runs its own isolated VSC
 * instance. Every frame announces its controller (video) count to a hub (the
 * top frame), which keeps a registry of which frames own controllers. The top
 * frame is both hub and spoke. Popup commands use this registry to find the
 * frame(s) to act on.
 */
import { logger } from '../utils/logger.js';
import { COORD_MSG, makeMessage, parseMessage } from './messages.js';

const LOG = '[VSC-COORD]';

// Self-assigned per-frame id. The MAIN world has no chrome.tabs/frameId access,
// so we mint a readable id from location + a per-load counter. Uniqueness only
// needs to hold within one tab's frame tree for the lifetime of the page.
let _idCounter = 0;
function mintFrameId() {
  _idCounter += 1;

  const top = window === window.top ? 'TOP' : 'IFRAME';

  let host = '';
  try {
    host = location.host || location.href.slice(0, 32);
  } catch {
    host = 'unknown';
  }

  // No Date.now()/Math.random() needed — counter + host is enough per page load.
  return `${top}:${host}#${_idCounter}`;
}

export class FrameCoordinator {
  /**
   * @param {object} opts
   * @param {() => number} opts.getLocalControllerCount - returns current count
   *   of controllers (videos) registered in THIS frame's stateManager.
   */
  constructor({ getLocalControllerCount }) {
    this.frameId = mintFrameId();
    this.isTop = window === window.top;
    this.getLocalControllerCount = getLocalControllerCount || (() => 0);

    // HUB-only state: live registry of every frame that has said hello.
    // frameId -> { controllerCount, source } where source is the MessageEventSource
    // we reply through (null for the hub's own spoke, which we call directly).
    this.registry = new Map();

    this._messageHandler = (event) => this._onMessage(event);
    this._installed = false;
  }

  /** Install listeners + announce presence. Safe to call once per frame. */
  start() {
    if (this._installed) {
      return;
    }
    this._installed = true;

    window.addEventListener('message', this._messageHandler, false);

    logger.warn(
      `${LOG} ${'='.repeat(8)} frame init ${'='.repeat(8)} id=${this.frameId} ` +
        `role=${this.isTop ? 'HUB+spoke' : 'spoke'} url=${safeUrl()}`
    );

    // Hub can't postMessage to itself, so record its own spoke directly.
    if (this.isTop) {
      this._hubUpsert(this.frameId, this.getLocalControllerCount(), null);
    }

    this._send(COORD_MSG.HELLO, { controllerCount: this.getLocalControllerCount() });
  }

  /** Spoke API: call whenever this frame's controller count changes. */
  announceControllers() {
    const count = this.getLocalControllerCount();
    logger.warn(`${LOG} announce controllers: frame=${this.frameId} count=${count}`);

    if (this.isTop) {
      this._hubUpsert(this.frameId, count, null);
    }

    this._send(COORD_MSG.CONTROLLERS, { controllerCount: count });
  }

  // --- transport ---------------------------------------------------------

  _send(type, payload) {
    // Hub already updated its own registry synchronously; nothing to post.
    if (this.isTop && (type === COORD_MSG.HELLO || type === COORD_MSG.CONTROLLERS)) {
      return;
    }
    try {
      // '*' origin is intentional: cross-origin iframes are the case we serve,
      // and payloads carry no secrets.
      logger.warn(`${LOG} SEND → top  type=${type} from=${this.frameId} payload=${safeJson(payload)}`);

      window.top.postMessage(makeMessage(type, { ...payload, frameId: this.frameId }), '*');
    } catch (e) {
      logger.warn(`${LOG} postMessage to top failed: ${e.message}`);
    }
  }

  _onMessage(event) {
    const msg = parseMessage(event.data);
    if (!msg) {
      return;
    }

    logger.warn(
      `${LOG} RECV ← type=${msg.type} at=${this.frameId} from=${payloadFrameId(event, msg)} ` +
        `origin=${safeOrigin(event)} payload=${safeJson(msg.payload)}`
    );

    switch (msg.type) {
      case COORD_MSG.HELLO:
      case COORD_MSG.CONTROLLERS:
        if (this.isTop) {
          this._hubUpsert(payloadFrameId(event, msg), msg.payload.controllerCount || 0, event.source);
        }
        break;

      default:
        break;
    }
  }

  // --- hub logic ---------------------------------------------------------

  _hubUpsert(frameId, controllerCount, source) {
    if (!frameId) {
      return;
    }
    const isNew = !this.registry.has(frameId);
    this.registry.set(frameId, { controllerCount, source });

    logger.warn(
      `${LOG} [hub] registry ${isNew ? 'ADD' : 'update'} ${frameId} (controllers=${controllerCount}). ` +
        `Now ${this.registry.size} frame(s): ${this._registrySummary()}`
    );
  }

  _registrySummary() {
    return [...this.registry.entries()].map(([id, info]) => `${id}:${info.controllerCount}`).join(', ');
  }

  /** Tear down listeners (called on extension teardown). */
  stop() {
    if (!this._installed) {
      return;
    }
    window.removeEventListener('message', this._messageHandler, false);

    this.registry.clear();
    this._installed = false;
  }
}

// postMessage only exposes event.source/origin, not the sender's id — so the
// spoke stamps frameId into the payload (see _send) and we read it back here.
function payloadFrameId(event, msg) {
  return (msg.payload && msg.payload.frameId) || `origin:${safeOrigin(event)}`;
}

function safeUrl() {
  try {
    return location.href.slice(0, 80);
  } catch {
    return 'unknown';
  }
}

function safeOrigin(event) {
  try {
    return event.origin || 'unknown';
  } catch {
    return 'unknown';
  }
}

/** Compact, throw-safe JSON for logging message payloads. */
function safeJson(value) {
  try {
    const str = JSON.stringify(value);
    return str && str.length > 200 ? `${str.slice(0, 200)}…` : str || '{}';
  } catch {
    return '<unserializable>';
  }
}
