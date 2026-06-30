/**
 * Leader / exclusive-capture mode.
 *
 * Press a trigger key (default 'q') to enter a mode where bare keys
 * ('v', 'a', 's', ...) map to actions, so we don't have to burn scarce
 * Ctrl/Alt/Shift combos. While active, the mode owns the keyboard: the page
 * (and downstream listeners) must not see the keys.
 *
 * How we win the key:
 *   1. Listen on `window` with { capture: true } — fires before document-level
 *      and before the page's bubble-phase listeners.
 *   2. stopImmediatePropagation() (stronger than stopPropagation) also kills
 *      other capture-phase listeners registered after us on window.
 *   3. Swallow both keydown and keyup — track which keydowns we ate so we eat
 *      the matching keyup (sites/browsers sometimes act on keyup).
 *
 * Hard limits:
 *   - Browser/OS shortcuts (Ctrl+T, Ctrl+W, F-keys, Cmd+Q) never reach the DOM.
 *   - Another extension capturing at window may win depending on injection
 *     order — exclusivity is best-effort, not guaranteed.
 *
 * Swallowing is gated behind LEADER_SWALLOW; when off, keys reach the page.
 */

import { logger } from '../utils/logger.js';
import {
  LEADER_ENABLED,
  LEADER_SWALLOW,
  LEADER_TRIGGER_KEY,
  LEADER_BINDINGS,
  LEADER_TIMEOUT_MS,
} from './flags.js';
import { describeKey, focusSnapshot } from './debug.js';
import { LeaderIndicator } from './leader-indicator.js';

const LOG = '[VSC-LEADER]';

export class LeaderMode {
  /**
   * @param {object} opts
   * @param {(intent: object) => void} opts.onLeaderAction - called with
   *   { key, action, leader: true } when a leader binding fires.
   * @param {string} [opts.frameId] - id of the frame this instance runs in,
   *   so logs from different frames are distinguishable.
   */
  constructor({ onLeaderAction, frameId } = {}) {
    this.onLeaderAction = onLeaderAction || (() => {});
    this.frameId = frameId || '(unknown-frame)';

    this.active = false;
    this._consumedKeys = new Set(); // keys whose keyup we must also swallow
    this._timeoutId = null;
    this._keyCount = 0; // running tally of keydowns this frame has seen

    this._keydown = (e) => this._onKeyDown(e);
    this._keyup = (e) => this._onKeyUp(e);
    this._installed = false;
    this._indicator = new LeaderIndicator({ triggerKey: LEADER_TRIGGER_KEY });
  }

  /** Prefix every log line with the frame id so multi-frame output is readable. */
  _tag() {
    return `${LOG}[${this.frameId}]`;
  }

  start() {
    if (!LEADER_ENABLED || this._installed) {
      return;
    }
    this._installed = true;

    // capture so we run before page listeners; passive:false to allow preventDefault.
    window.addEventListener('keydown', this._keydown, { capture: true, passive: false });
    window.addEventListener('keyup', this._keyup, { capture: true, passive: false });

    logger.warn(
      `${this._tag()} installed (swallow=${LEADER_SWALLOW}, trigger="${LEADER_TRIGGER_KEY}") ${focusSnapshot()}`
    );
  }

  stop() {
    if (!this._installed) {
      return;
    }
    window.removeEventListener('keydown', this._keydown, { capture: true });
    window.removeEventListener('keyup', this._keyup, { capture: true });

    this._clearTimeout();
    this.active = false;
    this._consumedKeys.clear();
    this._installed = false;

    this._indicator.destroy();
  }

  _onKeyDown(event) {
    const { key } = event;

    this._keyCount += 1;
    logger.warn(
      `${this._tag()} keydown #${this._keyCount} [active=${this.active}] ${describeKey(event)} ${focusSnapshot()}`
    );

    if (!this.active && key === LEADER_TRIGGER_KEY) {
      this._enter();
      this._swallow(event, key, 'enter-trigger');
      return;
    }

    if (!this.active) {
      logger.warn(`${this._tag()} pass-through (not in leader mode): key="${key}"`);
      return;
    }

    this._resetTimeout();

    if (key === 'Escape') {
      logger.warn(`${this._tag()} exit via Escape`);
      this._exit();
      this._swallow(event, key, 'exit');
      return;
    }

    const action = LEADER_BINDINGS[key] || null;
    if (action) {
      logger.warn(`${this._tag()} leader key "${key}" -> action="${action}"`);
      this.onLeaderAction({ key, action, leader: true });
    } else {
      logger.warn(`${this._tag()} leader key "${key}" -> no binding`);
    }

    // Swallow regardless of binding so leader keystrokes never leak to the page.
    this._swallow(event, key, action ? 'binding' : 'unmapped');

    if (action) {
      this._exit();
    }
  }

  _onKeyUp(event) {
    const { key } = event;
    if (this._consumedKeys.has(key)) {
      this._consumedKeys.delete(key);
      logger.warn(`${this._tag()} keyup follow-up for consumed key="${key}"`);
      this._swallow(event, key, 'keyup-followup');
    }
  }

  _enter() {
    this.active = true;
    this._indicator.show();
    logger.warn(`${this._tag()} enter leader mode ${focusSnapshot()}`);

    this._resetTimeout();
  }

  _exit() {
    this.active = false;
    this._indicator.hide();
    logger.warn(`${this._tag()} exit leader mode`);

    this._clearTimeout();
  }

  _swallow(event, key, reason) {
    this._consumedKeys.add(key);

    if (LEADER_SWALLOW) {
      event.preventDefault();
      event.stopImmediatePropagation();
      logger.warn(`${this._tag()} swallowed key="${key}" (${reason})`);
    } else {
      logger.warn(`${this._tag()} swallow skipped key="${key}" (${reason})`);
    }
  }

  _resetTimeout() {
    this._clearTimeout();
    this._timeoutId = setTimeout(() => {
      if (this.active) {
        logger.warn(`${this._tag()} auto-exit after ${LEADER_TIMEOUT_MS}ms idle`);
        this._exit();
      }
    }, LEADER_TIMEOUT_MS);
  }

  _clearTimeout() {
    if (this._timeoutId) {
      clearTimeout(this._timeoutId);
      this._timeoutId = null;
    }
  }
}
