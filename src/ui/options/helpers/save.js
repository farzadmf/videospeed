import { createKeyBinding } from './bindings.js';
import { validate } from './validate.js';
import { REG_STRIP } from '../../../shared/constants.js';
import { VSC_DEFAULTS } from '../../../shared/defaults.js';

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
  const exclusiveKeys = document.getElementById('exclusiveKeys').checked;
  const forceLastSavedSpeed = document.getElementById('forceLastSavedSpeed').checked;
  const logLevel = Number(document.getElementById('logLevel').value);
  const rememberSpeed = document.getElementById('rememberSpeed').checked;
  const startHidden = document.getElementById('startHidden').checked;
  const yt_spb = document.getElementById('yt_spb').checked;
  const yt_spb_sound_enabled = document.getElementById('yt_spb_sound_enabled').checked;
  const yt_spb_skip_sound = document.getElementById('yt_spb_skip_sound').value;
  const yt_spb_unskip_sound = document.getElementById('yt_spb_unskip_sound').value;
  const yt_spb_interval = Number(document.getElementById('yt_spb_interval').value) || VSC_DEFAULTS.sites.youtube.spb_interval;
  const yt_spb_skip = document.getElementById('yt_spb_skip').checked;
  const yt_spb_categories = Array.from(document.querySelectorAll('#yt_spb_categories .spb-category:checked')).map((el) => el.value);

  chrome.storage.sync.set(
    {
      audioBoolean,
      blacklist: blacklist.map((value) => value.replace(REG_STRIP, '')),
      controllerButtonSize,
      controllerOpacity,
      enabled,
      exclusiveKeys,
      forceLastSavedSpeed,
      keyBindings,
      logLevel,
      rememberSpeed,
      startHidden,
      sites: {
        youtube: {
          spb_categories: yt_spb_categories,
          spb_enabled: yt_spb,
          spb_interval: yt_spb_interval,
          spb_skip: yt_spb_skip,
          spb_skip_sound: yt_spb_skip_sound,
          spb_sound_enabled: yt_spb_sound_enabled,
          spb_unskip_sound: yt_spb_unskip_sound,
        },
      },
    },
    () => {
      // Feedback is now handled by the save button's dirty-state classes
    }
  );
};
