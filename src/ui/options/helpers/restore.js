import { VSC_DEFAULTS } from '../../../shared/defaults.js';
import { ACTIONS, NO_VALUE_ACTIONS } from '../../../shared/actions.js';
import { addBinding, updateCustomShortcutInputText } from './bindings.js';
import { getActionName, getTcDefaultBinding } from './misc.js';

const _ = window._;

export function restoreOptions() {
  chrome.storage.sync.get(VSC_DEFAULTS, (storage) => {
    document.getElementById('audioBoolean').checked = storage.audioBoolean;
    document.getElementById('blacklist').value = storage.blacklist.join('\n');
    document.getElementById('controllerButtonSize').value = storage.controllerButtonSize;
    document.getElementById('controllerOpacity').value = storage.controllerOpacity;
    document.getElementById('logLevel').value = storage.logLevel;
    document.getElementById('enabled').checked = storage.enabled;
    document.getElementById('forceLastSavedSpeed').checked = storage.forceLastSavedSpeed;
    document.getElementById('rememberSpeed').checked = storage.rememberSpeed;
    document.getElementById('startHidden').checked = storage.startHidden;

    const keyBindings = _.sortBy(storage.keyBindings, (b) => {
      return b.action.description;
    });

    for (const binding of keyBindings) {
      const actionName = getActionName(binding.action);
      const tcDefault = getTcDefaultBinding(actionName);

      addBinding(binding);

      const dom = document.querySelector('#shortcuts tbody tr:last-of-type');
      dom.querySelector('.customDo').value = actionName;

      if (NO_VALUE_ACTIONS.includes(actionName)) {
        dom.querySelector('.customValue').style.display = 'none';
      } else {
        dom.querySelector('.customValue').value = binding.value || tcDefault.action.value;
      }

      updateCustomShortcutInputText(dom.querySelector('.customKey'), binding);

      dom.querySelector('input[name="alt"]').checked = !!binding.alt;
      dom.querySelector('input[name="shift"]').checked = !!binding.shift;
      dom.querySelector('input[name="ctrl"]').checked = !!binding.ctrl;

      const force = JSON.parse(binding.force);
      dom.querySelector('.customForce').value = force;

      const colorCls = force ? 'text-warning' : 'text-success';
      dom.querySelector('.customForce').classList.add(colorCls);

      const customValue2 = dom.querySelector('.customValue2');
      if (customValue2) {
        customValue2.value = binding.value2 || tcDefault.action.value2;
      }
    }

    const total = _.keys(ACTIONS).length;
    const used = document.querySelectorAll('#shortcuts tbody tr').length;

    if (used < total) {
      document.querySelector('#add').style.display = '';
    }
  });
}

export function restoreDefaults() {
  chrome.storage.sync.set(VSC_DEFAULTS, () => {
    document.querySelector('#shortcuts tbody').replaceChildren();
    restoreOptions();

    // Update status to let user know options were saved.
    const status = document.getElementById('status');
    status.textContent = 'Default options restored';
    setTimeout(() => {
      status.textContent = '';
    }, 1000);
  });
}
