import { REG_STRIP, LOG_LEVELS } from './constants.js';
import { ACTIONS } from './actions.js';

/**
 * All SponsorBlock categories the extension knows about. Colors mirror
 * SponsorBlock's own defaults so users coming from SB see the same palette.
 */
export const SPB_CATEGORIES = [
  { color: '#00d400', label: 'Sponsor', name: 'sponsor' },
  { color: '#ffff00', label: 'Self-promotion', name: 'selfpromo' },
  { color: '#cc00ff', label: 'Interaction reminder', name: 'interaction' },
  { color: '#00ffff', label: 'Intro', name: 'intro' },
  { color: '#0202ed', label: 'Outro', name: 'outro' },
  { color: '#008fd6', label: 'Preview / recap', name: 'preview' },
  { color: '#ff9900', label: 'Non-music', name: 'music_offtopic' },
  { color: '#7300ff', label: 'Filler tangent', name: 'filler' },
];

export const VSC_DEFAULTS = {
  // Position the controller via CSS anchor positioning; turn off to use the JS observer model
  anchorPositioning: true,
  audioBoolean: true,
  blacklist: ['www.instagram.com', 'imgur.com', 'teams.microsoft.com'].map((value) => value.replace(REG_STRIP, '')),
  controllerButtonSize: 14,
  controllerOpacity: 0.8,
  defaultLogLevel: LOG_LEVELS.INFO,
  enabled: true,
  exclusiveKeys: true,
  forceLastSavedSpeed: true,
  // Key that enters leader mode. Same shape as a keyBindings entry's key part:
  // a physical `code` plus optional modifier flags.
  leaderKey: { code: 'KeyQ' },
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
    { action: ACTIONS.skip_do, code: 'KeyU', predefined: false, shift: true, alt: true },
    { action: ACTIONS.skip_undo, code: 'KeyU', predefined: false, alt: true },
  ],
  lastSpeed: 1.0,
  logLevel: LOG_LEVELS.WARNING,
  rememberSpeed: true,
  sites: {
    youtube: {
      // 'spb' means SponsorBlock
      spb_sound_enabled: true, // Play sound on segment skip/unskip
      spb_skip_sound: 'beep', // Which sound to play on segment skip
      spb_unskip_sound: 'pop_01', // Which sound to play on undo skip
      spb_enabled: true, // Generally enabled or not
      spb_interval: 5, // Seconds between SponsorBlock API re-fetches
      // Categories to request from the SponsorBlock API. `name` matches the API's
      // category ID; `color` paints the progress-bar marker; `should_skip` toggles
      // auto-skip (when false the segment still shows on the bar but the handler
      // won't seek past it).
      spb_categories: [
        { color: '#00d400', name: 'sponsor', should_skip: true },
      ],
    },
  },
  speed: 1.0,
  sources: {}, // empty object to hold stored values for each source
  startHidden: false,
};
