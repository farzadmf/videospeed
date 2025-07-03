import { createKeyBindings, keyBindings } from './bindings.js';
import { validate } from './validate.js';
import { REG_STRIP } from '../../../shared/constants.js';

export const saveOptions = () => {
  if (!validate()) {
    return;
  }

  Array.from(document.querySelectorAll('#shortcuts tr')).forEach((item) => createKeyBindings(item)); // Remove added shortcuts

  const audioBoolean = document.getElementById('audioBoolean').checked;
  const blacklist = document.getElementById('blacklist').value;
  const controllerButtonSize = Number(document.getElementById('controllerButtonSize').value);
  const controllerOpacity = Number(document.getElementById('controllerOpacity').value);
  const enabled = document.getElementById('enabled').checked;
  const forceLastSavedSpeed = document.getElementById('forceLastSavedSpeed').checked;
  const logLevel = Number(document.getElementById('logLevel').value);
  const rememberSpeed = document.getElementById('rememberSpeed').checked;
  const startHidden = document.getElementById('startHidden').checked;

  chrome.storage.sync.remove([
    'advanceKeyCode',
    'advanceTime',
    'defaultLogLevel',
    'fasterKeyCode',
    'fastKeyCode',
    'fastSpeed',
    'resetKeyCode',
    'resetSpeed',
    'rewindKeyCode',
    'rewindTime',
    'slowerKeyCode',
    'speedStep',
  ]);
  chrome.storage.sync.set(
    {
      audioBoolean,
      blacklist: blacklist.replace(REG_STRIP, ''),
      controllerButtonSize,
      controllerOpacity,
      enabled,
      forceLastSavedSpeed,
      keyBindings,
      logLevel,
      rememberSpeed,
      startHidden,
    },
    () => {
      // Update status to let user know options were saved.
      const status = document.getElementById('status');
      status.textContent = 'Options saved';
      setTimeout(() => {
        status.textContent = '';
      }, 1000);
    }
  );
};
