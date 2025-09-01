import { getTcDefaultBinding } from './misc.js';
import { actionByName, ALLOWED_ACTION_OPTIONS, ACTION_OPTIONS, NO_VALUE_ACTIONS } from '../../../shared/actions.js';
import { BLACKLISTED_CODES, BLACKLISTED_KEYS, KEY_CODES, KEYS } from './key-codes.js';

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
    <input class="customKey w-75 form-control" type="text" value="" placeholder="press a key" />
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

export function createKeyBinding(binding) {
  // Ignore rows not containing anything!
  if (!binding.querySelector('.customDo')) {
    return;
  }

  const actionName = binding.querySelector('.customDo').value;
  const action = actionByName(actionName);
  const tcDefault = getTcDefaultBinding(action);

  const customKeyEl = binding.querySelector('.customKey');
  const { alt, code, ctrl, key, shift } = customKeyEl;

  const force = JSON.parse(binding.querySelector('.customForce').value);
  const predefined = !!binding.querySelector('.predefined');

  let newBinding = {
    action,
    code,
    force,
    key,
    predefined,
  };

  if (shift) {
    newBinding = { ...newBinding, shift: Boolean(shift) };
  }
  if (alt) {
    newBinding = { ...newBinding, alt: Boolean(alt) };
  }
  if (ctrl) {
    newBinding = { ...newBinding, ctrl: Boolean(alt) };
  }

  if (!NO_VALUE_ACTIONS.includes(actionName)) {
    const value = Number(binding.querySelector('.customValue').value);
    if (value !== tcDefault.action.value) {
      newBinding = { ...newBinding, value };
    }

    const value2El = binding.querySelector('.customValue2');
    if (value2El) {
      const value2 = Number(value2El.value);
      if (value2 !== tcDefault.action.value2) {
        newBinding = { ...newBinding, value2 };
      }
    }
  }

  return newBinding;
}

/**
 * @param {KeyboardEvent} event - Keyboard event
 */
export function recordKeyPress(event) {
  const { altKey, code, ctrlKey, key, shiftKey } = event;

  // Special handling for backspace and escape
  if (key === 'Escape') {
    // Clear input when backspace pressed
    event.target.value = '';
    event.preventDefault();
    event.stopPropagation();
    return;
  } else if (key === 'Backspace') {
    // When esc clicked, clear input
    event.target.value = 'null';
    event.target.keyCode = null;
    event.preventDefault();
    event.stopPropagation();
    return;
  }

  // Block blacklisted keys
  if (BLACKLISTED_KEYS.includes(key) || BLACKLISTED_CODES.includes(code)) {
    event.preventDefault();
    event.stopPropagation();
    return;
  }

  // Accept all other keys
  // Use friendly name if available, otherwise show the key itself
  event.target.value = (KEYS[code] || code).replace(/^(Key|Digit)/, '');

  event.target.alt = altKey;
  event.target.key = key;
  event.target.code = code;
  event.target.shift = shiftKey;
  event.target.ctrl = ctrlKey;

  const alt = event.target.parentElement.previousElementSibling.querySelector('[name="alt"]');
  const shift = event.target.parentElement.previousElementSibling.querySelector('[name="shift"]');
  const ctrl = event.target.parentElement.previousElementSibling.querySelector('[name="ctrl"]');
  alt.checked = altKey;
  shift.checked = shiftKey;
  ctrl.checked = ctrlKey;

  event.preventDefault();
  event.stopPropagation();
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
  e.target.value = KEY_CODES[keyCode] || (keyCode >= 48 && keyCode <= 90 ? String.fromCharCode(keyCode) : `Key ${keyCode}`);
}

// MyNote: commented because I didn't have it, and I don't think it's needed.
// export function updateShortcutInputText(inputId, keyCode) {
//   const input = document.getElementById(inputId);
//   input.value =
//     KEY_CODES[keyCode] ||
//     (keyCode >= 48 && keyCode <= 90 ? String.fromCharCode(keyCode) : `Key ${keyCode}`);
//   input.keyCode = keyCode;
// }

export function updateCustomShortcutInputText(inputItem, binding) {
  const { alt, code, ctrl, key, shift } = binding;
  inputItem.value = (KEYS[code] || code).replace(/^(Key|Digit)/, '');

  inputItem.key = key;
  inputItem.code = code;
  inputItem.alt = alt;
  inputItem.shift = shift;
  inputItem.ctrl = ctrl;
}
