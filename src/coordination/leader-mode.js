/**
 * Leader / exclusive-capture mode.
 *
 * Press the leader key to enter a mode where configured keys map to actions,
 * so we don't have to burn scarce Ctrl/Alt/Shift combos. While active, the mode
 * owns the keyboard: the page (and downstream listeners) must not see the keys.
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
 * The trigger and exit keys are always swallowed (they toggle our mode).
 * Action bindings are gated behind SWALLOW_ENABLED until they dispatch.
 */

import { logger } from '../utils/logger.js';
import { describeKey, focusSnapshot } from './debug.js';
import { LeaderIndicator } from './leader-indicator.js';
import { isTypingContext } from '../utils/dom-utils.js';

const LOG = '[VSC-LEADER]';

// Gate for action bindings only. Off until matched keys dispatch real actions —
// otherwise a swallowed key would flash but do nothing.
const SWALLOW_ENABLED = false;

export class LeaderMode {
  /**
   * @param {object} opts
   * @param {import('../core/config.js').VideoSpeedConfig} opts.config - read
   *   live so option changes take effect without rebuilding.
   * @param {(intent: object) => void} opts.onLeaderAction - called with
   *   { key, action, leader: true } when a leader binding fires.
   * @param {() => boolean} [opts.hasControllers] - whether this frame has any
   *   controllers; when false the listener is a no-op.
   * @param {string} [opts.frameId] - id of the frame this instance runs in.
   */
  constructor({ config, onLeaderAction, hasControllers, frameId } = {}) {
    this.config = config;
    this.onLeaderAction = onLeaderAction || (() => {});
    this.hasControllers = hasControllers || (() => false);
    this.frameId = frameId || '(unknown-frame)';

    this.active = false;
    this._consumedKeys = new Map(); // key -> force; keyup we must also swallow
    this._timeoutId = null;
    this._keyCount = 0; // running tally of keydowns this frame has seen

    this._keydown = (e) => this._onKeyDown(e);
    this._keyup = (e) => this._onKeyUp(e);
    this._installed = false;
    this._indicator = new LeaderIndicator();
  }

  _tag() {
    return `${LOG}[${this.frameId}]`;
  }

  get _settings() {
    return this.config?.settings || {};
  }

  start() {
    if (this._installed) {
      return;
    }
    this._installed = true;

    // capture so we run before page listeners; passive:false to allow preventDefault.
    window.addEventListener('keydown', this._keydown, { capture: true, passive: false });
    window.addEventListener('keyup', this._keyup, { capture: true, passive: false });

    logger.warn(`${this._tag()} installed (swallow=${SWALLOW_ENABLED}) ${focusSnapshot()}`);
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
    this._keyCount += 1;
    logger.warn(`${this._tag()} keydown #${this._keyCount} [active=${this.active}] ${describeKey(event)} ${focusSnapshot()}`);

    // Never capture while typing; exit if we were active so the badge doesn't linger.
    if (isTypingContext(event.target)) {
      if (this.active) {
        this._exit();
      }
      return;
    }

    // No controllers on this frame: leader mode has nothing to act on, stay passive.
    if (!this.hasControllers()) {
      return;
    }

    if (!this.active) {
      if (keyMatches(event, this._settings.leaderKey)) {
        this._enter();
        // Force: the trigger toggles our mode, so it must never reach the page
        // (unlike action bindings, which wait on SWALLOW_ENABLED).
        this._swallow(event, event.key, 'enter-trigger', true);
      } else {
        logger.warn(`${this._tag()} pass-through (not in leader mode): key="${event.key}"`);
      }
      return;
    }

    // Escape or re-pressing the leader key always exits, regardless of exit mode.
    if (event.key === 'Escape' || keyMatches(event, this._settings.leaderKey)) {
      this._exit();
      this._swallow(event, event.key, 'exit', true);
      return;
    }

    this._resetTimeout();

    const binding = this._matchBinding(event);
    if (binding) {
      const action = binding.action?.name || binding.action;
      logger.warn(`${this._tag()} leader key "${event.key}" -> action="${action}"`);
      this.onLeaderAction({ key: event.key, action, leader: true });

      // Swallow only matched keys; unmapped keys pass through to the page.
      this._swallow(event, event.key, 'binding');
    } else {
      logger.warn(`${this._tag()} leader key "${event.key}" -> no binding (pass-through)`);
    }
  }

  _onKeyUp(event) {
    const { key } = event;
    if (this._consumedKeys.has(key)) {
      const force = this._consumedKeys.get(key);
      this._consumedKeys.delete(key);
      logger.warn(`${this._tag()} keyup follow-up for consumed key="${key}"`);
      this._swallow(event, key, 'keyup-followup', force);
    }
  }

  _matchBinding(event) {
    const bindings = this._settings.leaderBindings || [];
    return bindings.find((b) => keyMatches(event, b)) || null;
  }

  _enter() {
    this.active = true;
    this._indicator.show(this._overlayModel());
    logger.warn(`${this._tag()} enter leader mode ${focusSnapshot()}`);

    this._resetTimeout();
  }

  _exit() {
    this.active = false;
    this._indicator.hide();
    logger.warn(`${this._tag()} exit leader mode`);

    this._clearTimeout();
  }

  _swallow(event, key, reason, force = false) {
    this._consumedKeys.set(key, force);

    if (force || SWALLOW_ENABLED) {
      event.preventDefault();
      event.stopImmediatePropagation();
      logger.warn(`${this._tag()} swallowed key="${key}" (${reason})`);
    } else {
      logger.warn(`${this._tag()} swallow skipped key="${key}" (${reason})`);
    }
  }

  _resetTimeout() {
    this._clearTimeout();

    // Only the timer exit mode auto-closes; key mode waits for Escape/leader key.
    if (this._settings.leaderExit !== 'timer') {
      return;
    }

    const ms = this._settings.leaderTimeout || 2000;
    this._timeoutId = setTimeout(() => {
      if (this.active) {
        logger.warn(`${this._tag()} auto-exit after ${ms}ms idle`);
        this._exit();
      }
    }, ms);
  }

  _clearTimeout() {
    if (this._timeoutId) {
      clearTimeout(this._timeoutId);
      this._timeoutId = null;
    }
  }

  /** Data the indicator renders: each binding's key label + action name. */
  _overlayModel() {
    const rows = (this._settings.leaderBindings || []).map((b) => ({
      keyLabel: keyLabel(b),
      action: b.action?.name || String(b.action),
    }));
    return { rows };
  }
}

function keyMatches(event, spec) {
  return (
    !!spec &&
    event.code === spec.code &&
    !!event.ctrlKey === !!spec.ctrl &&
    !!event.shiftKey === !!spec.shift &&
    !!event.altKey === !!spec.alt
  );
}

/** Readable label for a binding's key + modifiers, e.g. "V", "Ctrl+A". */
function keyLabel(binding) {
  const parts = [];
  if (binding.ctrl) {
    parts.push('Ctrl');
  }
  if (binding.shift) {
    parts.push('Shift');
  }
  if (binding.alt) {
    parts.push('Alt');
  }
  parts.push((binding.code || '').replace(/^(Key|Digit)/, ''));

  return parts.join('+');
}
