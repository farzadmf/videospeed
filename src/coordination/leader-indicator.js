/**
 * On-screen panel shown while leader mode is active, centered in the viewport.
 * Self-contained (own shadow root, no dependency on the controller UI) so it
 * works in any frame regardless of whether a controller exists.
 *
 * Shows a "VSC" header and the list of leader bindings (key -> action) so the
 * user can see what to press without leaving the page.
 */

import styles from './leader-indicator.css';

const HOST_ID = 'vsc-leader-indicator';

export class LeaderIndicator {
  constructor() {
    this._host = null;
    this._panel = null;
    this._list = null;
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
    style.textContent = styles;

    const panel = document.createElement('div');
    panel.className = 'panel';

    const header = document.createElement('div');
    header.className = 'header';

    const dot = document.createElement('span');
    dot.className = 'dot';

    const title = document.createElement('span');
    title.textContent = 'VSC';

    header.append(dot, title);

    const list = document.createElement('div');
    list.className = 'list';

    panel.append(header, list);
    shadow.append(style, panel);
    (document.body || document.documentElement).appendChild(host);

    this._host = host;
    this._panel = panel;
    this._list = list;
  }

  /** @param {{rows: Array<{keyLabel: string, action: string}>}} model */
  show(model) {
    this._ensure();
    this._renderRows(model?.rows || []);

    // Force reflow so the transition runs even when show() follows hide() fast.
    void this._panel.offsetWidth;
    this._panel.classList.add('show');
  }

  _renderRows(rows) {
    this._list.replaceChildren();

    if (rows.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'empty';
      empty.textContent = 'No bindings configured';
      this._list.append(empty);
      return;
    }

    for (const { keyLabel, action } of rows) {
      const row = document.createElement('div');
      row.className = 'row';

      const key = document.createElement('span');
      key.className = 'key';
      key.textContent = keyLabel;

      const label = document.createElement('span');
      label.className = 'action';
      label.textContent = action;

      row.append(key, label);
      this._list.append(row);
    }
  }

  hide() {
    this._panel?.classList.remove('show');
  }

  destroy() {
    this._host?.remove();
    this._host = this._panel = this._list = null;
  }
}
