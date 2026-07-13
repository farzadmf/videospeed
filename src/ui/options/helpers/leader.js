import { ACTION_OPTIONS, actionByName } from '../../../shared/actions.js';
import { displayLabelForCode, layoutMapReady } from './bindings.js';
import { BLACKLISTED_CODES, BLACKLISTED_KEYS } from './key-codes.js';
import { getActionName } from './misc.js';

const LEADER_KEY_INPUT_ID = 'leaderKey';

// The input shows only the key; its physical `code` and the modifiers (in the
// checkboxes) are read back separately in collectLeaderKey.
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

// No binding arg = empty row (the Add New button).
export function addLeaderBinding(binding = {}) {
  const action = getActionName(binding.action);

  const html = `
<tr>
  <td>
    <select class="leaderDo form-select">
      ${ACTION_OPTIONS.join('\n')}
    </select>
  </td>
  <td>
    <div class="form-check">
      <input type="checkbox" class="form-check-input" name="alt" />
      <label class="modifier form-check-label">ALT</label>
    </div>
    <div class="form-check">
      <input type="checkbox" class="form-check-input" name="shift" />
      <label class="modifier form-check-label">SHIFT</label>
    </div>
    <div class="form-check">
      <input type="checkbox" class="form-check-input" name="ctrl" />
      <label class="modifier form-check-label">CTRL</label>
    </div>
  </td>
  <td>
    <input class="leaderBindingKey form-control" type="text" value="" placeholder="press a key" />
  </td>
  <td>
    <button class="removeLeaderBinding btn btn-danger">X</button>
  </td>
</tr>
`;

  const tbody = document.querySelector('#leader-bindings tbody');
  tbody.insertAdjacentHTML('beforeend', html);

  const row = tbody.querySelector('tr:last-of-type');
  if (action) {
    row.querySelector('.leaderDo').value = action;
  }

  row.querySelector('input[name="alt"]').checked = !!binding.alt;
  row.querySelector('input[name="shift"]').checked = !!binding.shift;
  row.querySelector('input[name="ctrl"]').checked = !!binding.ctrl;

  const keyInput = row.querySelector('.leaderBindingKey');
  keyInput.code = binding.code || '';
  keyInput.value = binding.code ? displayLabelForCode(binding.code) : '';
}

// Modifiers held during capture are recorded into the row's checkboxes.
export function recordLeaderBindingKey(event) {
  const { altKey, code, ctrlKey, key, shiftKey } = event;
  const row = event.target.closest('tr');

  if (key === 'Escape') {
    event.target.code = '';
    event.target.value = '';
    setRowModifiers(row, { ctrl: false, shift: false, alt: false });
    markChanged(event.target);
    event.preventDefault();
    event.stopPropagation();
    return;
  }

  if (BLACKLISTED_KEYS.includes(key) || BLACKLISTED_CODES.includes(code)) {
    event.preventDefault();
    event.stopPropagation();
    return;
  }

  event.target.code = code;
  event.target.value = displayLabelForCode(code);
  setRowModifiers(row, { ctrl: ctrlKey, shift: shiftKey, alt: altKey });

  markChanged(event.target);
  event.preventDefault();
  event.stopPropagation();
}

export async function restoreLeaderBindings(leaderBindings = []) {
  const tbody = document.querySelector('#leader-bindings tbody');
  if (!tbody) {
    return;
  }

  await layoutMapReady;

  tbody.replaceChildren();
  for (const binding of leaderBindings) {
    addLeaderBinding(binding);
  }
}

// Rows without a captured key are dropped.
export function collectLeaderBindings() {
  const rows = document.querySelectorAll('#leader-bindings tbody tr');

  return Array.from(rows)
    .map((row) => {
      const keyInput = row.querySelector('.leaderBindingKey');
      const action = actionByName(row.querySelector('.leaderDo').value);
      if (!keyInput?.code || !action) {
        return null;
      }

      const binding = { action, code: keyInput.code };
      if (row.querySelector('input[name="ctrl"]').checked) {
        binding.ctrl = true;
      }
      if (row.querySelector('input[name="shift"]').checked) {
        binding.shift = true;
      }
      if (row.querySelector('input[name="alt"]').checked) {
        binding.alt = true;
      }

      return binding;
    })
    .filter(Boolean);
}

function setRowModifiers(row, { ctrl, shift, alt }) {
  row.querySelector('input[name="ctrl"]').checked = ctrl;
  row.querySelector('input[name="shift"]').checked = shift;
  row.querySelector('input[name="alt"]').checked = alt;
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
