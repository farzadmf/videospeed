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
  TRACE: 6,
  CUSTOM: 10,
};

export const REG_STRIP = /^[\r\t\f\v ]+|[\r\t\f\v ]+$/gm;
export const REG_ENDS_WITH_FLAGS = /\/(?!.*(.).*\1)[gimsuy]*$/;
