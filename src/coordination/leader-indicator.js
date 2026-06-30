/**
 * On-screen badge shown while leader mode is active, centered in the viewport.
 * Self-contained (own shadow root, no dependency on the controller UI) so it
 * works in any frame regardless of whether a controller exists.
 */

const HOST_ID = 'vsc-leader-indicator';

export class LeaderIndicator {
  constructor({ triggerKey } = {}) {
    this.triggerKey = triggerKey || '';
    this._host = null;
    this._badge = null;
  }

  _ensure() {
    if (this._host) {
      return;
    }

    const host = document.createElement('div');
    host.id = HOST_ID;
    host.style.cssText =
      'all: initial; position: fixed; inset: 0; z-index: 2147483647; ' +
      'pointer-events: none; display: flex; align-items: center; justify-content: center;';

    const shadow = host.attachShadow({ mode: 'open' });
    const style = document.createElement('style');
    style.textContent = `
      .badge {
        display: inline-flex;
        align-items: center;
        gap: 10px;
        font: 700 18px/1 -apple-system, system-ui, sans-serif;
        color: #fff;
        background: rgba(20, 20, 24, 0.88);
        border: 1px solid rgba(255, 255, 255, 0.18);
        border-radius: 10px;
        padding: 14px 20px;
        box-shadow: 0 6px 24px rgba(0, 0, 0, 0.45);
        opacity: 0;
        transform: scale(0.96);
        transition: opacity 120ms ease, transform 120ms ease;
      }
      .badge.show { opacity: 1; transform: scale(1); }
      .dot {
        width: 11px; height: 11px; border-radius: 50%;
        background: #4ade80;
        box-shadow: 0 0 8px #4ade80;
      }
    `;

    // Build children programmatically — sites with a Trusted Types CSP (e.g.
    // YouTube) throw on any innerHTML string assignment.
    const badge = document.createElement('div');
    badge.className = 'badge';

    const dot = document.createElement('span');
    dot.className = 'dot';

    const label = document.createElement('span');
    label.className = 'label';

    badge.append(dot, label);

    shadow.append(style, badge);
    (document.body || document.documentElement).appendChild(host);

    this._host = host;
    this._badge = badge;
    this._label = label;
  }

  /** @param {string} [hint] - optional text shown next to the dot. */
  show(hint) {
    this._ensure();
    this._label.textContent = hint || `LEADER${this.triggerKey ? ` ${this.triggerKey}` : ''}`;

    // Force reflow so the transition runs even when show() follows hide() fast.
    void this._badge.offsetWidth;
    this._badge.classList.add('show');
  }

  hide() {
    this._badge?.classList.remove('show');
  }

  destroy() {
    this._host?.remove();
    this._host = this._badge = this._label = null;
  }
}
