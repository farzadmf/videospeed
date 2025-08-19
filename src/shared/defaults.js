import { REG_STRIP, LOG_LEVELS } from './constants.js';
import { ACTIONS } from './actions.js';

export const VSC_DEFAULTS = {
  audioBoolean: true,
  blacklist: ['www.instagram.com', '/^x.com/', 'imgur.com', 'teams.microsoft.com'].map((value) => value.replace(REG_STRIP, '')),
  controllerButtonSize: 14,
  controllerOpacity: 0.8,
  defaultLogLevel: LOG_LEVELS.INFO,
  displayKeyCode: 86, // key: V
  enabled: true,
  forceLastSavedSpeed: true,
  keyBindings: [
    { action: ACTIONS.display, force: false, code: 'KeyV', key: 'v', predefined: true }, // V
    { action: ACTIONS.fast, force: false, code: 'KeyG', key: 'g', predefined: true }, // G
    { action: ACTIONS.faster, force: false, code: 'Quote', key: "'", predefined: true }, // '
    { action: ACTIONS.fixspeed_10, force: true, code: 'Digit1', key: '1', predefined: false }, // 1
    { action: ACTIONS.fixspeed_15, force: true, code: 'Digit1', key: '1', predefined: false, shift: true }, // shift+1
    { action: ACTIONS.fixspeed_20, force: true, code: 'Digit2', key: '2', predefined: false }, // 2
    { action: ACTIONS.fixspeed_25, force: true, code: 'Digit2', key: '2', predefined: false, shift: true }, // shift+2
    { action: ACTIONS.fixspeed_30, force: true, code: 'Digit3', key: '3', predefined: false }, // 3
    { action: ACTIONS.fixspeed_35, force: true, code: 'Digit3', key: '3', predefined: false, shift: true }, // shift+3
    { action: ACTIONS.fixspeed_40, force: true, code: 'Digit4', key: '4', predefined: false }, // 4
    { action: ACTIONS.fixspeed_45, force: true, code: 'Digit4', key: '4', predefined: false, shift: true }, // shift+4
    { action: ACTIONS.fixspeed_50, force: true, code: 'Digit5', key: '5', predefined: false }, // 5
    { action: ACTIONS.fixspeed_55, force: true, code: 'Digit5', key: '5', predefined: false, shift: true }, // shift+5
    { action: ACTIONS.fixspeed_60, force: true, code: 'Digit6', key: '6', predefined: false }, // 6
    { action: ACTIONS.fixspeed_65, force: true, code: 'Digit6', key: '6', predefined: false, shift: true }, // shift+6
    { action: ACTIONS.fixspeed_70, force: true, code: 'Digit7', key: '7', predefined: false }, // 7
    { action: ACTIONS.fixspeed_75, force: true, code: 'Digit7', key: '7', predefined: false, shift: true }, // shift+7
    { action: ACTIONS.fixspeed_80, force: true, code: 'Digit8', key: '8', predefined: false }, // 8
    { action: ACTIONS.fixspeed_85, force: true, code: 'Digit8', key: '8', predefined: false, shift: true }, // shift+8
    { action: ACTIONS.fixspeed_90, force: true, code: 'Digit9', key: '9', predefined: false }, // 9
    { action: ACTIONS.fixspeed_95, force: true, code: 'Digit9', key: '9', predefined: false, shift: true }, // shift+9
    { action: ACTIONS.go_start, force: false, code: 'Digit0', key: '0', predefined: false }, // 0
    { action: ACTIONS.pause, force: false, code: 'Period', key: '.', predefined: false }, // .
    { action: ACTIONS.reset, force: false, code: 'KeyR', key: 'r', predefined: true }, // R
    { action: ACTIONS.slower, force: false, code: 'Semicolon', key: ';', predefined: true }, // ;
    { action: ACTIONS.vol_down, force: true, code: 'ArrowDown', key: 'ArrowDown', predefined: true }, // Down
    { action: ACTIONS.vol_up, force: true, code: 'ArrowUp', key: 'ArrowUp', predefined: true }, // Up
    { action: ACTIONS.rewind, force: true, code: 'ArrowLeft', key: 'ArrowLeft', predefined: true }, // Left
    { action: ACTIONS.advance, force: true, code: 'ArrowRight', key: 'ArrowRight', predefined: true }, // Right
  ],
  lastSpeed: 1.0,
  logLevel: LOG_LEVELS.WARNING,
  rememberSpeed: true,
  speed: 1.0,
  sources: {}, // empty object to hold stored values for each source
  startHidden: false,
};
