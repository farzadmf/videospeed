import { REG_STRIP, LOG_LEVELS } from './constants.js';
import { ACTIONS } from './actions.js';

export const VSC_DEFAULTS = {
  audioBoolean: false,
  blacklist: `www.instagram.com
    twitter.com
    vine.co
    imgur.com
    teams.microsoft.com
  `.replace(REG_STRIP, ''),
  controllerButtonSize: 14,
  controllerOpacity: 0.8,
  defaultLogLevel: LOG_LEVELS.INFO,
  displayKeyCode: 86, // key: V
  enabled: true,
  forceLastSavedSpeed: true,
  keyBindings: [
    { action: ACTIONS.display, force: false, key: 86, predefined: true }, // V
    { action: ACTIONS.fast, force: false, key: 71, predefined: true }, // G
    { action: ACTIONS.faster, force: false, key: 186, predefined: true }, // '
    { action: ACTIONS.fixspeed_10, force: true, key: 49, predefined: false }, // 1
    { action: ACTIONS.fixspeed_15, force: true, key: 49, predefined: false, shift: true }, // shift+1
    { action: ACTIONS.fixspeed_20, force: true, key: 50, predefined: false }, // 2
    { action: ACTIONS.fixspeed_25, force: true, key: 50, predefined: false, shift: true }, // shift+2
    { action: ACTIONS.fixspeed_30, force: true, key: 51, predefined: false }, // 3
    { action: ACTIONS.fixspeed_35, force: true, key: 51, predefined: false, shift: true }, // shift+3
    { action: ACTIONS.fixspeed_40, force: true, key: 52, predefined: false }, // 4
    { action: ACTIONS.fixspeed_45, force: true, key: 52, predefined: false, shift: true }, // shift+4
    { action: ACTIONS.fixspeed_50, force: true, key: 53, predefined: false }, // 5
    { action: ACTIONS.fixspeed_55, force: true, key: 53, predefined: false, shift: true }, // shift+5
    { action: ACTIONS.fixspeed_60, force: true, key: 54, predefined: false }, // 6
    { action: ACTIONS.fixspeed_65, force: true, key: 54, predefined: false, shift: true }, // shift+6
    { action: ACTIONS.fixspeed_70, force: true, key: 55, predefined: false }, // 7
    { action: ACTIONS.fixspeed_75, force: true, key: 55, predefined: false, shift: true }, // shift+7
    { action: ACTIONS.fixspeed_80, force: true, key: 56, predefined: false }, // 8
    { action: ACTIONS.fixspeed_85, force: true, key: 56, predefined: false, shift: true }, // shift+8
    { action: ACTIONS.fixspeed_90, force: true, key: 57, predefined: false }, // 9
    { action: ACTIONS.fixspeed_95, force: true, key: 57, predefined: false, shift: true }, // shift+9
    { action: ACTIONS.go_start, force: false, key: 48, predefined: false }, // 0
    { action: ACTIONS.pause, force: false, key: 190, predefined: false }, // .
    { action: ACTIONS.reset, force: false, key: 82, predefined: true }, // R
    { action: ACTIONS.slower, force: false, key: 222, predefined: true }, // ;
    { action: ACTIONS.vol_down, force: true, key: 40, predefined: true }, // Down
    { action: ACTIONS.vol_up, force: true, key: 38, predefined: true }, // Up
    { action: ACTIONS.rewind, force: true, key: 37, predefined: true }, // Left
    { action: ACTIONS.advance, force: true, key: 39, predefined: true }, // Right
  ],
  lastSpeed: 1.0,
  logLevel: LOG_LEVELS.WARNING,
  rememberSpeed: true,
  speed: 1.0,
  sources: {}, // empty object to hold stored values for each source
  startHidden: false,
};
