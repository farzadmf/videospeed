import { REG_STRIP, LOG_LEVELS } from './constants.js';
import { ACTIONS } from './actions.js';

export const VSC_DEFAULTS = {
  audioBoolean: true,
  blacklist: ['www.instagram.com', 'imgur.com', 'teams.microsoft.com'].map((value) => value.replace(REG_STRIP, '')),
  controllerButtonSize: 14,
  controllerOpacity: 0.8,
  defaultLogLevel: LOG_LEVELS.INFO,
  enabled: true,
  exclusiveKeys: true,
  forceLastSavedSpeed: true,
  keyBindings: [
    { action: ACTIONS.display, code: 'KeyV', predefined: true, shift: true, ctrl: true },
    { action: ACTIONS.fast, code: 'KeyG', predefined: true },
    { action: ACTIONS.faster, code: 'BracketRight', predefined: true, shift: true, alt: true },
    { action: ACTIONS.fixspeed_10, code: 'Digit1', predefined: false, alt: true },
    { action: ACTIONS.fixspeed_15, code: 'Digit1', predefined: false, shift: true, alt: true },
    { action: ACTIONS.fixspeed_20, code: 'Digit2', predefined: false, alt: true },
    { action: ACTIONS.fixspeed_25, code: 'Digit2', predefined: false, shift: true, alt: true },
    { action: ACTIONS.fixspeed_30, code: 'Digit3', predefined: false, alt: true },
    { action: ACTIONS.fixspeed_35, code: 'Digit3', predefined: false, shift: true, alt: true },
    { action: ACTIONS.fixspeed_40, code: 'Digit4', predefined: false, alt: true },
    { action: ACTIONS.fixspeed_45, code: 'Digit4', predefined: false, shift: true, alt: true },
    { action: ACTIONS.fixspeed_50, code: 'Digit5', predefined: false, alt: true },
    { action: ACTIONS.fixspeed_55, code: 'Digit5', predefined: false, shift: true, alt: true },
    { action: ACTIONS.fixspeed_60, code: 'Digit6', predefined: false, alt: true },
    { action: ACTIONS.fixspeed_65, code: 'Digit6', predefined: false, shift: true, alt: true },
    { action: ACTIONS.fixspeed_70, code: 'Digit7', predefined: false, alt: true },
    { action: ACTIONS.fixspeed_75, code: 'Digit7', predefined: false, shift: true, alt: true },
    { action: ACTIONS.fixspeed_80, code: 'Digit8', predefined: false, alt: true },
    { action: ACTIONS.fixspeed_85, code: 'Digit8', predefined: false, shift: true, alt: true },
    { action: ACTIONS.fixspeed_90, code: 'Digit9', predefined: false, alt: true },
    { action: ACTIONS.fixspeed_95, code: 'Digit9', predefined: false, shift: true, alt: true },
    { action: ACTIONS.go_start, code: 'Digit0', predefined: false },
    { action: ACTIONS.pause, code: 'Period', predefined: false, alt: true },
    { action: ACTIONS.pip_toggle, code: 'KeyP', predefined: false, shift: true, alt: true },
    { action: ACTIONS.reset, code: 'KeyR', predefined: true },
    { action: ACTIONS.slower, code: 'BracketLeft', predefined: true, shift: true, alt: true },
    { action: ACTIONS.vol_down, code: 'ArrowDown', predefined: true },
    { action: ACTIONS.vol_up, code: 'ArrowUp', predefined: true },
    { action: ACTIONS.rewind, code: 'ArrowLeft', predefined: true },
    { action: ACTIONS.advance, code: 'ArrowRight', predefined: true },
  ],
  lastSpeed: 1.0,
  logLevel: LOG_LEVELS.WARNING,
  rememberSpeed: true,
  sites: {
    youtube: {
      // 'spb' means SponsorBlock
      spb_enabled: true, // Generally enabled or not
      spb_interval: 5, // Seconds between SponsorBlock API re-fetches
      spb_skip: true, // Skip enabled or not
    },
  },
  speed: 1.0,
  sources: {}, // empty object to hold stored values for each source
  startHidden: false,
};
