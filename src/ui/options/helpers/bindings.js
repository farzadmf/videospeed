import { getTcDefaultBinding } from './misc.js';
import {
  actionByName,
  ALLOWED_ACTION_OPTIONS,
  ACTION_OPTIONS,
  NO_VALUE_ACTIONS,
} from '../../../shared/actions.js';
import { BLACKLISTED_KEYCODES, KEY_CODES } from './key-codes.js';

export const keyBindings = [];

export function addBinding(item) {
  // When this is called because we click "Add New" in options, 'item' would be a PointerEvent,
  //  so 'action' and 'preddefined' would be undefined.
  const { action, predefined } = item;

  let valueHtml = `
  <input class="customValue w-50 form-control" type="text" placeholder="value (0.10)" />
`;

  if (!(action === undefined || predefined === undefined)) {
    const value2 = item.value2 || action.value2;
    const tcDefault = getTcDefaultBinding(action);

    if (value2) {
      valueHtml = `
  <span>${tcDefault.action.preValueText}</span>
  <input class="customValue" style="width: 10%; display: inline-block;" type="text" placeholder="value (${tcDefault.action.value})" />
  <span>${tcDefault.action.postValueText}</span>
  <input class="customValue2" style="width: 10%; display: inline-block" type="text" placeholder="value (${tcDefault.action.value2})" />
  <span>${tcDefault.action.postValue2Text}</span>
`;
    }
  }

  let removeBtn = '';
  let predefinedInput = '';
  if (!predefined) {
    removeBtn = '<button class="removeParent btn btn-danger">X</button>';
  } else {
    predefinedInput = '<input type="hidden" class="predefined" />';
  }

  const html = `
<tr id="${action}">
  <td>
    ${predefinedInput}
    <select class="customDo form-select">
      ${action === undefined ? ALLOWED_ACTION_OPTIONS().join('\n') : ACTION_OPTIONS.join('\n')}
    </select>
  </td>
  <td>
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
    <input class="customKey w-50 form-control" type="text" value="" placeholder="press a key" />
  </td>
  <td>
    ${valueHtml}
  </td>
  <td>
    <select class="customForce form-select">
      <option value="false">Do not disable website key bindings</option>
      <option value="true">Disable website key bindings</option>
    </select>
  </td>
  <td>${removeBtn}</td>
</tr>
`;
  const shortcuts = document.querySelector('#shortcuts tbody');
  shortcuts.insertAdjacentHTML('beforeend', html);

  const forceSelect = shortcuts.querySelector('tr:last-of-type .customForce');
  forceSelect.addEventListener('change', (event) => {
    const target = event.target;
    const value = JSON.parse(target.value);

    target.classList.remove('text-warning');
    target.classList.remove('text-success');

    const colorCls = value ? 'text-warning' : 'text-success';
    target.classList.add(colorCls);
  });
}

export function createKeyBindings(item) {
  // Ignore rows not containing anything!
  if (!item.querySelector('.customDo')) {
    return;
  }

  const actionName = item.querySelector('.customDo').value;
  const action = actionByName(actionName);
  const tcDefault = getTcDefaultBinding(action);

  const key = item.querySelector('.customKey').keyCode;

  const shift = item.querySelector('input[name="shift"]').checked;
  const ctrl = item.querySelector('input[name="ctrl"]').checked;

  const force = JSON.parse(item.querySelector('.customForce').value);
  const predefined = !!item.querySelector('.predefined');

  let binding = {
    action,
    key,
    force,
    predefined,
  };

  if (shift) {
    binding = { ...binding, shift };
  }
  if (ctrl) {
    binding = { ...binding, ctrl };
  }

  if (!NO_VALUE_ACTIONS.includes(actionName)) {
    const value = Number(item.querySelector('.customValue').value);
    if (value !== tcDefault.action.value) {
      binding = { ...binding, value };
    }

    const value2El = item.querySelector('.customValue2');
    if (value2El) {
      const value2 = Number(value2El.value);
      if (value2 !== tcDefault.action.value2) {
        binding = { ...binding, value2 };
      }
    }
  }

  keyBindings.push(binding);
}

export function recordKeyPress(e) {
  // Special handling for backspace and escape
  if (e.keyCode === 8) {
    // Clear input when backspace pressed
    e.target.value = '';
    e.preventDefault();
    e.stopPropagation();
    return;
  } else if (e.keyCode === 27) {
    // When esc clicked, clear input
    e.target.value = 'null';
    e.target.keyCode = null;
    e.preventDefault();
    e.stopPropagation();
    return;
  }

  // Block blacklisted keys
  if (BLACKLISTED_KEYCODES.includes(e.keyCode)) {
    e.preventDefault();
    e.stopPropagation();
    return;
  }

  // Accept all other keys
  // Use friendly name if available, otherwise show "Key {code}"
  e.target.value =
    KEY_CODES[e.keyCode] ||
    (e.keyCode >= 48 && e.keyCode <= 90 ? String.fromCharCode(e.keyCode) : `Key ${e.keyCode}`);

  e.target.keyCode = e.keyCode;
  e.target.shift = e.shiftKey;
  e.target.ctrl = e.ctrlKey;

  const shift = e.target.nextElementSibling;
  const ctrl = shift.nextElementSibling.nextElementSibling;
  shift.checked = e.shiftKey;
  ctrl.checked = e.ctrlKey;

  e.preventDefault();
  e.stopPropagation();
}

export function inputFilterNumbersOnly(e) {
  const char = String.fromCharCode(e.keyCode);
  if (!/[\d.]$/.test(char) || !/^\d+(\.\d*)?$/.test(e.target.value + char)) {
    e.preventDefault();
    e.stopPropagation();
  }
}

export function inputFocus(e) {
  return (e.target.value = '');
}

export function inputBlur(e) {
  const keyCode = e.target.keyCode;
  e.target.value =
    KEY_CODES[keyCode] ||
    (keyCode >= 48 && keyCode <= 90 ? String.fromCharCode(keyCode) : `Key ${keyCode}`);
}

// MyNote: commented because I didn't have it, and I don't think it's needed.
// export function updateShortcutInputText(inputId, keyCode) {
//   const input = document.getElementById(inputId);
//   input.value =
//     KEY_CODES[keyCode] ||
//     (keyCode >= 48 && keyCode <= 90 ? String.fromCharCode(keyCode) : `Key ${keyCode}`);
//   input.keyCode = keyCode;
// }

export function updateCustomShortcutInputText(inputItem, keyCode) {
  inputItem.value =
    KEY_CODES[keyCode] ||
    (keyCode >= 48 && keyCode <= 90 ? String.fromCharCode(keyCode) : `Key ${keyCode}`);
  inputItem.keyCode = keyCode;
}
