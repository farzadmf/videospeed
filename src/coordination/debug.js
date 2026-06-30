/**
 * Throw-safe formatters for coordination/leader logs.
 * All wrapped in try/catch so logging can never break the real flow.
 */

/**
 * Snapshot of this frame's focus/visibility state — the key signal for the
 * iframe routing problem ("only the focused frame receives keydown").
 * @returns {string}
 */
export function focusSnapshot() {
  let hasFocus = '?';
  let active = '?';
  let visibility = '?';

  try {
    hasFocus = String(document.hasFocus());
  } catch {
    /* ignore */
  }

  try {
    active = describeEl(document.activeElement);
  } catch {
    /* ignore */
  }

  try {
    visibility = document.visibilityState;
  } catch {
    /* ignore */
  }

  return `focus[hasFocus=${hasFocus} active=${active} vis=${visibility}]`;
}

/**
 * Compact description of a DOM element for logging.
 * @param {Element|null} el
 * @returns {string}
 */
export function describeEl(el) {
  if (!el) {
    return 'none';
  }
  try {
    const tag = (el.tagName || '?').toLowerCase();
    const id = el.id ? `#${el.id}` : '';
    const cls =
      typeof el.className === 'string' && el.className
        ? `.${el.className.trim().split(/\s+/).slice(0, 2).join('.')}`
        : '';
    const editable = el.isContentEditable ? '{editable}' : '';
    return `${tag}${id}${cls}${editable}`;
  } catch {
    return '<el?>';
  }
}

/**
 * Full key descriptor: key, code, modifiers, and flags that commonly cause
 * "why didn't my shortcut fire" confusion (repeat, isComposing, IME).
 * @param {KeyboardEvent} event
 * @returns {string}
 */
export function describeKey(event) {
  try {
    const mods = [
      event.ctrlKey ? 'C' : '',
      event.altKey ? 'A' : '',
      event.shiftKey ? 'S' : '',
      event.metaKey ? 'M' : '',
    ]
      .filter(Boolean)
      .join('+');

    const flags = [
      event.repeat ? 'repeat' : '',
      event.isComposing ? 'composing' : '',
      event.keyCode === 229 ? 'ime229' : '',
    ]
      .filter(Boolean)
      .join(',');

    return (
      `key="${event.key}" code=${event.code} kc=${event.keyCode}` +
      `${mods ? ` mods=${mods}` : ''}${flags ? ` flags=${flags}` : ''}` +
      ` target=${describeEl(event.target)}`
    );
  } catch {
    return '<key?>';
  }
}
