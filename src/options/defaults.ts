import { ACTIONS } from '../shread/all-actions';
import { REG_STRIP } from './constants';
import { Options } from './types';

export const defaultOptions = new Options({
  blacklist: `www.instagram.com
    twitter.com
    imgur.com
    teams.microsoft.com
  `.replace(REG_STRIP, ''),
  audioBoolean: false,
  controllerOpacity: 0.6,
  displayKeyCode: 86,
  enabled: true,
  forceLastSavedSpeed: false,
  keyBindings: [
    { action: ACTIONS.display, force: false, key: 86, predefined: true }, // V
    { action: ACTIONS.fast, force: false, key: 71, predefined: true }, // G
    { action: ACTIONS.faster, force: false, key: 186, predefined: true }, // '
    { action: ACTIONS['fixspeed-1.0' as keyof typeof ACTIONS], force: true, key: 49, predefined: false }, // 1
    { action: ACTIONS['fixspeed-1.5' as keyof typeof ACTIONS], force: true, key: 49, predefined: false, shift: true }, // shift+1
    { action: ACTIONS['fixspeed-2.0' as keyof typeof ACTIONS], force: true, key: 50, predefined: false }, // 2
    { action: ACTIONS['fixspeed-2.5' as keyof typeof ACTIONS], force: true, key: 50, predefined: false, shift: true }, // shift+2
    { action: ACTIONS['fixspeed-3.0' as keyof typeof ACTIONS], force: true, key: 51, predefined: false }, // 3
    { action: ACTIONS['fixspeed-3.5' as keyof typeof ACTIONS], force: true, key: 51, predefined: false, shift: true }, // shift+3
    { action: ACTIONS['fixspeed-4.0' as keyof typeof ACTIONS], force: true, key: 52, predefined: false }, // 4
    { action: ACTIONS['fixspeed-4.5' as keyof typeof ACTIONS], force: true, key: 52, predefined: false, shift: true }, // shift+4
    { action: ACTIONS['fixspeed-5.0' as keyof typeof ACTIONS], force: true, key: 53, predefined: false }, // 5
    { action: ACTIONS['fixspeed-5.5' as keyof typeof ACTIONS], force: true, key: 53, predefined: false, shift: true }, // shift+5
    { action: ACTIONS['fixspeed-6.0' as keyof typeof ACTIONS], force: true, key: 54, predefined: false }, // 6
    { action: ACTIONS['fixspeed-6.5' as keyof typeof ACTIONS], force: true, key: 54, predefined: false, shift: true }, // shift+6
    { action: ACTIONS['fixspeed-7.0' as keyof typeof ACTIONS], force: true, key: 55, predefined: false }, // 7
    { action: ACTIONS['fixspeed-7.5' as keyof typeof ACTIONS], force: true, key: 55, predefined: false, shift: true }, // shift+7
    { action: ACTIONS['fixspeed-8.0' as keyof typeof ACTIONS], force: true, key: 56, predefined: false }, // 8
    { action: ACTIONS['fixspeed-8.5' as keyof typeof ACTIONS], force: true, key: 56, predefined: false, shift: true }, // shift+8
    { action: ACTIONS['fixspeed-9.0' as keyof typeof ACTIONS], force: true, key: 57, predefined: false }, // 9
    { action: ACTIONS['fixspeed-9.5' as keyof typeof ACTIONS], force: true, key: 57, predefined: false, shift: true }, // shift+9
    { action: ACTIONS['go-start'], force: false, key: 48, predefined: false }, // 0
    { action: ACTIONS.pause, force: false, key: 49, predefined: false }, // 1
    { action: ACTIONS.reset, force: false, key: 82, predefined: true }, // R
    { action: ACTIONS.slower, force: false, key: 222, predefined: true }, // ;
    { action: ACTIONS['vol-down'], force: true, key: 40, predefined: true }, // Down
    { action: ACTIONS['vol-up'], force: true, key: 38, predefined: true }, // Up
    { action: ACTIONS.rewind, force: true, key: 37, predefined: true }, // Left
    { action: ACTIONS.advance, force: true, key: 39, predefined: true }, // Right
  ],
  logLevel: 3,
  rememberSpeed: false,
  speed: 1.0,
  startHidden: false,
});
