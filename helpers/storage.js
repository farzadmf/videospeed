function syncSpeedValue({ speed, url }) {
  if (!speed || Number(speed) === 1) {
    // No need to save 1x; it's the default, also it helps to avoid reaching Chrome sync max item size.
    delete vsc.settings.speeds[url];
  } else {
    log('Storing lastSpeed in settings for the rememberSpeed feature', DEBUG);
    vsc.settings.lastSpeed = speed;
    log('Syncing chrome settings for lastSpeed', DEBUG);

    vsc.settings.speeds[url] = {
      speed,
      updated: new Date().valueOf(),
    };
  }

  try {
    chrome.storage.sync.set(
      {
        lastSpeed: speed,
        speeds: vsc.settings.speeds,
      },
      () => log('Speed (and SPEEDS) setting saved: ' + speed, DEBUG),
    );
  } catch (err) {
    log('got an error when saving speed', WARNING, err);
  }
}

const initLocalStorage = () => {
  chrome.storage.sync.get(vsc.settings, function (storage) {
    vsc.settings.keyBindings = storage.keyBindings; // Array

    // --> update keybindings from storage and sync back {{{
    //
    if (storage.keyBindings.length == 0) {
      // if first initialization of 0.5.3
      // UPDATE
      vsc.settings.keyBindings.push({
        action: 'slower',
        key: Number(storage.slowerKeyCode) || 222,
        value: Number(storage.speedStep) || 0.1,
        force: false,
        predefined: true,
      }); // default S
      vsc.settings.keyBindings.push({
        action: 'faster',
        key: Number(storage.fasterKeyCode) || 186,
        value: Number(storage.speedStep) || 0.1,
        force: false,
        predefined: true,
      }); // default: D
      vsc.settings.keyBindings.push({
        action: 'rewind',
        key: Number(storage.rewindKeyCode) || 90,
        value: Number(storage.rewindTime) || 10,
        force: false,
        predefined: true,
      }); // default: Z
      vsc.settings.keyBindings.push({
        action: 'advance',
        key: Number(storage.advanceKeyCode) || 88,
        value: Number(storage.advanceTime) || 10,
        force: false,
        predefined: true,
      }); // default: X
      vsc.settings.keyBindings.push({
        action: 'reset',
        key: Number(storage.resetKeyCode) || 82,
        value: 1.0,
        force: false,
        predefined: true,
      }); // default: R
      vsc.settings.keyBindings.push({
        action: 'fast',
        key: Number(storage.fastKeyCode) || 71,
        value: Number(storage.fastSpeed) || 3,
        force: false,
        predefined: true,
      }); // default: G
      vsc.settings.keyBindings.push({
        action: 'pause',
        key: 190,
        value: 1,
        force: false,
        predefined: false,
      }); // default: .
      for (let i = 1; i <= 9; i++) {
        vsc.settings.keyBindings.push({
          action: `fixspeed-${i}`,
          key: 48 + i, // 48 is zero
          shift: false,
          ctrl: false,
          value: i,
          force: true,
          predefined: false,
        });
        vsc.settings.keyBindings.push({
          action: `fixspeed-${i}.5`,
          key: 48 + i, // 48 is zero
          shift: true,
          ctrl: false,
          value: i + 0.5,
          force: true,
          predefined: false,
        });
      }
      vsc.settings.version = '0.5.3';

      chrome.storage.sync.set({
        audioBoolean: vsc.settings.audioBoolean,
        blacklist: vsc.settings.blacklist.replace(REG_STRIP, ''),
        controllerOpacity: vsc.settings.controllerOpacity,
        defaultLogLevel: vsc.settings.defaultLogLevel,
        displayKeyCode: vsc.settings.displayKeyCode,
        enabled: vsc.settings.enabled,
        forceLastSavedSpeed: vsc.settings.forceLastSavedSpeed,
        keyBindings: vsc.settings.keyBindings,
        rememberSpeed: vsc.settings.rememberSpeed,
        startHidden: vsc.settings.startHidden,
        version: vsc.settings.version,
      });
    }
    // }}}

    // --> update other settings from storage {{{
    vsc.settings.audioBoolean = Boolean(storage.audioBoolean);
    vsc.settings.blacklist = String(storage.blacklist);
    vsc.settings.controllerOpacity = Number(storage.controllerOpacity);
    vsc.settings.displayKeyCode = Number(storage.displayKeyCode);
    vsc.settings.enabled = Boolean(storage.enabled);
    vsc.settings.forceLastSavedSpeed = Boolean(storage.forceLastSavedSpeed);
    vsc.settings.lastSpeed = Number(storage.lastSpeed);
    vsc.settings.logLevel = Number(storage.logLevel);
    vsc.settings.rememberSpeed = Boolean(storage.rememberSpeed);
    vsc.settings.speeds = storage.speeds;
    vsc.settings.startHidden = Boolean(storage.startHidden);
    // }}}

    // ensure that there is a "display" binding (for upgrades from versions that had it as a separate binding)
    if (vsc.settings.keyBindings.filter((x) => x.action == 'display').length == 0) {
      vsc.settings.keyBindings.push({
        action: 'display',
        key: Number(storage.displayKeyCode) || 86,
        value: 0,
        force: false,
        predefined: true,
      }); // default V
    }

    initializeWhenReady(document);
  });
};

// vim: foldmethod=marker
