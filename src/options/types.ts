import { REG_STRIP } from './constants';

export type AudioVideoNode = HTMLAudioElement | HTMLVideoElement;

export type KeyBinding = {
  action: Action;
  ctrl?: boolean;
  force: boolean;
  key: number;
  postValue2Text?: string;
  postValueText?: string;
  predefined: boolean;
  preValueText?: string;
  shift?: boolean;
  value2?: number;
  value?: number;
};

export type Action = {
  name: string;
  description: string;
  value?: number;
};

export class Options {
  audioBoolean: boolean;
  blacklist: string;
  controllerOpacity: number;
  displayKeyCode: number;
  enabled: boolean;
  forceLastSavedSpeed: boolean;
  keyBindings: KeyBinding[];
  logLevel: number;
  rememberSpeed: boolean;
  speed: number;
  speeds: Record<string, { speed: number }>;
  startHidden: boolean;

  constructor({
    audioBoolean,
    blacklist,
    controllerOpacity,
    displayKeyCode,
    enabled,
    forceLastSavedSpeed,
    keyBindings,
    logLevel,
    rememberSpeed,
    speed,
    startHidden,
    speeds = {},
  }: {
    audioBoolean: boolean;
    blacklist: string;
    controllerOpacity: number;
    displayKeyCode: number;
    enabled: boolean;
    forceLastSavedSpeed: boolean;
    keyBindings: KeyBinding[];
    logLevel: number;
    rememberSpeed: boolean;
    speed: number;
    speeds?: Record<string, { speed: number }>;
    startHidden: boolean;
  }) {
    this.audioBoolean = audioBoolean;
    this.blacklist = blacklist.replace(REG_STRIP, '');
    this.controllerOpacity = controllerOpacity;
    this.displayKeyCode = displayKeyCode;
    this.enabled = enabled;
    this.forceLastSavedSpeed = forceLastSavedSpeed;
    this.keyBindings = keyBindings;
    this.logLevel = logLevel;
    this.rememberSpeed = rememberSpeed;
    this.speed = speed;
    this.speeds = speeds;
    this.startHidden = startHidden;
  }

  save(callback: () => void) {
    chrome.storage.sync.set(
      {
        audioBoolean: this.audioBoolean,
        blacklist: this.audioBoolean,
        controllerOpacity: this.controllerOpacity,
        enabled: this.enabled,
        forceLastSavedSpeed: this.forceLastSavedSpeed,
        keyBindings: this.keyBindings,
        logLevel: this.logLevel,
        rememberSpeed: this.rememberSpeed,
        startHidden: this.startHidden,
      },
      callback,
    );
  }

  validate() {
    let valid = true;

    this.blacklist.split('\n').forEach((match) => {
      match = match.replace(REG_STRIP, '');

      if (match.startsWith('/')) {
        try {
          const parts = match.split('/');

          if (parts.length < 3) throw 'invalid regex';

          const flags = parts.pop();
          const regex = parts.slice(1).join('/');

          new RegExp(regex, flags);
        } catch (err) {
          valid = false;
          return;
        }
      }
    });
    return valid;
  }
}
