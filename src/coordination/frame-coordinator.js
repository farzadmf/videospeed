/**
 * Cross-frame keyboard coordinator.
 *
 * The browser delivers a keydown only to the focused frame, but with
 * `all_frames: true` each cross-origin iframe runs its own isolated VSC
 * instance. So a key pressed while the top frame is focused never reaches the
 * iframe that owns the video — hence "I must click inside the frame first."
 *
 * Since one frame can't hear every key, each frame captures locally and
 * forwards the intent to a hub (the top frame), which tracks who owns
 * controllers and decides which frame should act. The top frame is both hub
 * and spoke.
 */
import { logger } from '../utils/logger.js';
import { focusSnapshot } from './debug.js';
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
   * @param {() => void} [opts.flashControllers] - flash this frame's controllers
   *   when a key is routed here.
   */
  constructor({ getLocalControllerCount, flashControllers }) {
    this.frameId = mintFrameId();
    this.isTop = window === window.top;
    this.getLocalControllerCount = getLocalControllerCount || (() => 0);
    this.flashControllers = flashControllers || (() => {});

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
        `role=${this.isTop ? 'HUB+spoke' : 'spoke'} url=${safeUrl()} ${focusSnapshot()}`
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

  /**
   * Spoke API: a key was captured locally. Forward the intent for the hub to route.
   * @param {object} intent - { key, code, ctrl, alt, shift, meta, leader }
   */
  forwardKeyIntent(intent) {
    const localCount = this.getLocalControllerCount();

    logger.warn(`${LOG} key intent: frame=${this.frameId} key="${intent.key}" localControllers=${localCount}`);

    if (this.isTop) {
      this._route({ ...intent, fromFrameId: this.frameId, fromLocalCount: localCount });
    } else {
      this._send(COORD_MSG.KEY_INTENT, { intent, localControllerCount: localCount });
    }
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

      case COORD_MSG.KEY_INTENT:
        if (this.isTop) {
          this._route({
            ...msg.payload.intent,
            fromFrameId: payloadFrameId(event, msg),
            fromLocalCount: msg.payload.localControllerCount || 0,
          });
        }
        break;

      case COORD_MSG.ROUTE:
        logger.warn(
          `${LOG} [spoke ${this.frameId}] routed here: key="${msg.payload.key}" ` +
            `action="${msg.payload.action || '?'}" ${focusSnapshot()}`
        );

        this.flashControllers();
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

  /**
   * Decide which frame should handle a key: origin frame if it has controllers,
   * else the sole controller frame, else the first of several.
   */
  _route(intent) {
    const framesWithControllers = [...this.registry.entries()].filter(([, info]) => info.controllerCount > 0);

    logger.warn(
      `${LOG} [hub] ROUTE key="${intent.key}" from=${intent.fromFrameId} ` +
        `(localControllers=${intent.fromLocalCount}); candidates=[${framesWithControllers
          .map(([id, info]) => `${id}:${info.controllerCount}`)
          .join(', ')}]`
    );

    let targetId = null;
    if (intent.fromLocalCount > 0) {
      targetId = intent.fromFrameId;
      logger.warn(`${LOG} [hub] decision: origin frame handles it (${targetId})`);
    } else if (framesWithControllers.length === 1) {
      targetId = framesWithControllers[0][0];
      logger.warn(`${LOG} [hub] decision: route to sole controller frame (${targetId})`);
    } else if (framesWithControllers.length === 0) {
      logger.warn(`${LOG} [hub] decision: no frame has controllers — drop`);
      return;
    } else {
      targetId = framesWithControllers[0][0];
      logger.warn(`${LOG} [hub] ${framesWithControllers.length} frames have controllers; picking first (${targetId})`);
    }

    const action = intent.action || null;
    this._dispatchRoute(targetId, { key: intent.key, action });
  }

  _dispatchRoute(targetId, body) {
    if (targetId === this.frameId) {
      logger.warn(`${LOG} [hub] target is local frame: key="${body.key}" action="${body.action || '?'}"`);

      this.flashControllers();
      return;
    }

    const entry = this.registry.get(targetId);
    const target = entry && entry.source;
    if (!target) {
      logger.warn(`${LOG} [hub] no postMessage source for target ${targetId} — cannot route`);
      return;
    }

    try {
      target.postMessage(makeMessage(COORD_MSG.ROUTE, body), '*');
      logger.warn(`${LOG} [hub] routed key="${body.key}" -> ${targetId}`);
    } catch (e) {
      logger.warn(`${LOG} [hub] route postMessage failed: ${e.message}`);
    }
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
