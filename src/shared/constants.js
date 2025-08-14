/* Log levels (depends on caller specifying the correct level)
  1 - none
  2 - error
  3 - warning
  4 - info
  5 - debug
  6 - debug high verbosity + stack trace on each message
*/

export const LOG_LEVELS = {
  NONE: 1,
  ERROR: 2,
  WARNING: 3,
  INFO: 4,
  DEBUG: 5,
  VERBOSE: 6,
  CUSTOM: 10,
};

export const REG_STRIP = /^[\r\t\f\v ]+|[\r\t\f\v ]+$/gm;
export const REG_ENDS_WITH_FLAGS = /\/(?!.*(.).*\1)[gimsuy]*$/;

export const MESSAGE_TYPES = {
  SET_SPEED: 'VSC_SET_SPEED',
  ADJUST_SPEED: 'VSC_ADJUST_SPEED',
  RESET_SPEED: 'VSC_RESET_SPEED',
  TOGGLE_DISPLAY: 'VSC_TOGGLE_DISPLAY',
};

export const SPEED_LIMITS = {
  MIN: 0.07, // Video min rate per Chromium source
  MAX: 16, // Maximum playback speed in Chrome per Chromium source
};

/**
 * Format speed value to 1 decimal places
 * @param {number|string} speed - Speed value
 * @returns {string} Formatted speed
 */
export function formatSpeed(speed) {
  return Number(speed).toFixed(1);
}

/**
 * Format volume value to 1 decimal places
 * @param {number|string} volume - Volume value
 * @returns {string} Formatted volume
 */
export function formatVolume(volume) {
  return (Number(volume) * 100).toFixed(0);
}
