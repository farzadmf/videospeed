import { createKeyBinding } from './bindings.js';
import { validate } from './validate.js';
import { REG_STRIP } from '../../../shared/constants.js';

export const saveOptions = () => {
  if (!validate()) {
    return;
  }

  const keyBindings = Array.from(document.querySelectorAll('#shortcuts tr'))
    .map((item) => createKeyBinding(item))
    .filter(Boolean);

  const audioBoolean = document.getElementById('audioBoolean').checked;
  const blacklist = document.getElementById('blacklist').value.trim().split('\n');
  const controllerButtonSize = Number(document.getElementById('controllerButtonSize').value);
  const controllerOpacity = Number(document.getElementById('controllerOpacity').value);
  const enabled = document.getElementById('enabled').checked;
  const forceLastSavedSpeed = document.getElementById('forceLastSavedSpeed').checked;
  const logLevel = Number(document.getElementById('logLevel').value);
  const rememberSpeed = document.getElementById('rememberSpeed').checked;
  const startHidden = document.getElementById('startHidden').checked;
  const yt_spb = document.getElementById('yt_spb').checked;
  const yt_spb_skip = document.getElementById('yt_spb_skip').checked;

  chrome.storage.sync.set(
    {
      audioBoolean,
      blacklist: blacklist.map((value) => value.replace(REG_STRIP, '')),
      controllerButtonSize,
      controllerOpacity,
      enabled,
      forceLastSavedSpeed,
      keyBindings,
      logLevel,
      rememberSpeed,
      startHidden,
      sites: {
        youtube: {
          spb_enabled: yt_spb,
          spb_skip: yt_spb_skip,
        },
      },
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
