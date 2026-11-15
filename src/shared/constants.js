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
  INVENTORY_COMMAND: 'VSC_INVENTORY_COMMAND',
  INVENTORY_START: 'VSC_INVENTORY_START',
  INVENTORY_STOP: 'VSC_INVENTORY_STOP',
  SET_SITE_SPEED: 'VSC_SET_SITE_SPEED',
  STATUS: 'VSC_STATUS',
  TEARDOWN: 'VSC_TEARDOWN',
};

// The popup opens one port per tab with no frameId, so Chrome connects it to every
// frame. Each frame reports its own videos on it.
export const INVENTORY_PORT = 'vsc-inventory';

// MAIN dispatches this on document.documentElement; the bridge relays it to the port.
export const INVENTORY_EVENT = 'VSC_INVENTORY';

// What a frame posts on the inventory port. The JSDoc type keeps the literal values,
// so the popup's TypeScript can tell the two message shapes apart.
/** @type {{ OUTCOME: 'outcome', SNAPSHOT: 'snapshot' }} */
export const INVENTORY_KIND = {
  OUTCOME: 'outcome',
  SNAPSHOT: 'snapshot',
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
