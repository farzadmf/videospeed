import { displayLabelForCode, layoutMapReady } from './bindings.js';
import { BLACKLISTED_CODES, BLACKLISTED_KEYS } from './key-codes.js';

const LEADER_KEY_INPUT_ID = 'leaderKey';

/**
 * Capture a key press into the leader-key input. Modifiers live in the ALT/
 * SHIFT/CTRL checkboxes (like the shortcuts table); the input itself holds only
 * the key, with the physical `code` stored on the element for reading back.
 * @param {KeyboardEvent} event
 */
export function recordLeaderKey(event) {
  const { altKey, code, ctrlKey, key, shiftKey } = event;

  if (key === 'Escape') {
    event.target.code = '';
    event.target.value = '';
    setModifiers({ ctrl: false, shift: false, alt: false });
    markChanged(event.target);
    event.preventDefault();
    event.stopPropagation();
    return;
  }

  // A bare modifier is not a valid trigger on its own.
  if (BLACKLISTED_KEYS.includes(key) || BLACKLISTED_CODES.includes(code)) {
    event.preventDefault();
    event.stopPropagation();
    return;
  }

  event.target.code = code;
  event.target.value = displayLabelForCode(code);
  setModifiers({ ctrl: ctrlKey, shift: shiftKey, alt: altKey });

  markChanged(event.target);
  event.preventDefault();
  event.stopPropagation();
}

/** Put the stored leaderKey object into the input + checkboxes on page load. */
export async function restoreLeaderKey(leaderKey = {}) {
  const input = document.getElementById(LEADER_KEY_INPUT_ID);
  if (!input) {
    return;
  }

  // Wait for the layout map so the label matches what live capture produces
  // (otherwise the code-label fallback shows e.g. "M" instead of "m").
  await layoutMapReady;

  input.code = leaderKey.code || '';
  input.value = leaderKey.code ? displayLabelForCode(leaderKey.code) : '';
  setModifiers({ ctrl: !!leaderKey.ctrl, shift: !!leaderKey.shift, alt: !!leaderKey.alt });
}

/** Read the input + checkboxes back into a leaderKey object for saving. */
export function collectLeaderKey() {
  const input = document.getElementById(LEADER_KEY_INPUT_ID);
  if (!input?.code) {
    return undefined;
  }

  const mods = getModifiers();

  const leaderKey = { code: input.code };
  if (mods.ctrl) {
    leaderKey.ctrl = true;
  }
  if (mods.shift) {
    leaderKey.shift = true;
  }
  if (mods.alt) {
    leaderKey.alt = true;
  }

  return leaderKey;
}

function modifierInput(name) {
  return document.querySelector(`#leader-key-table input[name="${name}"]`);
}

function setModifiers({ ctrl, shift, alt }) {
  modifierInput('leaderCtrl').checked = ctrl;
  modifierInput('leaderShift').checked = shift;
  modifierInput('leaderAlt').checked = alt;
}

function getModifiers() {
  return {
    ctrl: modifierInput('leaderCtrl').checked,
    shift: modifierInput('leaderShift').checked,
    alt: modifierInput('leaderAlt').checked,
  };
}

// Setting input.value in code does not fire input/change, so the save button's
// dirty-state listener never sees it. Dispatch a bubbling input event manually.
function markChanged(input) {
  input.dispatchEvent(new Event('input', { bubbles: true }));
}
