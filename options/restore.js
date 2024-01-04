const updateCustomShortcutInputText = (inputItem, keyCode) => {
  inputItem.value = KEY_CODES[keyCode] || String.fromCharCode(keyCode);
  inputItem.keyCode = keyCode;
};

const restoreOptions = () => {
  chrome.storage.sync.get(tcDefaults, function (storage) {
    document.getElementById('audioBoolean').checked = storage.audioBoolean;
    document.getElementById('blacklist').value = storage.blacklist;
    document.getElementById('controllerOpacity').value = storage.controllerOpacity;
    document.getElementById('logLevel').value = storage.logLevel;
    document.getElementById('enabled').checked = storage.enabled;
    document.getElementById('forceLastSavedSpeed').checked = storage.forceLastSavedSpeed;
    document.getElementById('rememberSpeed').checked = storage.rememberSpeed;
    document.getElementById('startHidden').checked = storage.startHidden;

    const keyBindings = _.sortBy(storage.keyBindings, (b) => b.action.description);

    for (let item of keyBindings) {
      const actionName = getActionName(item.action);
      const tcDefault = getTcDefaultBinding(actionName);

      addBinding(item);

      const dom = document.querySelector('#shortcuts tbody tr:last-of-type');
      dom.querySelector('.customDo').value = actionName;

      if (NO_VALUE_ACTIONS.includes(actionName)) {
        dom.querySelector('.customValue').style.display = 'none';
      }

      updateCustomShortcutInputText(dom.querySelector('.customKey'), item.key);
      dom.querySelector('input[name="shift"]').checked = !!item.shift;
      dom.querySelector('input[name="ctrl"]').checked = !!item.ctrl;

      dom.querySelector('.customValue').value = item.value || tcDefault.action.value;

      const force = JSON.parse(item.force);
      dom.querySelector('.customForce').value = force;

      const colorCls = force ? 'text-warning' : 'text-success';
      dom.querySelector('.customForce').classList.add(colorCls);

      const customValue2 = dom.querySelector('.customValue2');
      if (customValue2) customValue2.value = item.value2 || tcDefault.action.value2;
    }

    const total = _.keys(ACTIONS).length;
    const used = document.querySelectorAll('#shortcuts tbody tr').length;

    if (used < total) {
      document.querySelector('#add').style.display = '';
    }
  });
};

const restoreDefaults = () => {
  chrome.storage.sync.set(tcDefaults, function () {
    restoreOptions();
    document.querySelectorAll('.removeParent').forEach((button) => button.click()); // Remove added shortcuts
    // Update status to let user know options were saved.
    var status = document.getElementById('status');
    status.textContent = 'Default options restored';
    setTimeout(function () {
      status.textContent = '';
    }, 1000);
  });
};
