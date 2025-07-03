/* Log levels (depends on caller specifying the correct level)
  1 - none
  2 - error
  3 - warning
  4 - info
  5 - debug
  6 - debug high verbosity + stack trace on each message
*/
export const NONE = 1;
export const ERROR = 2;
export const WARNING = 3;
export const INFO = 4;
export const DEBUG = 5;
export const TRACE = 6;
export const CUSTOM = 10;

export const REG_STRIP = /^[\r\t\f\v ]+|[\r\t\f\v ]+$/gm;
export const REG_ENDS_WITH_FLAGS = /\/(?!.*(.).*\1)[gimsuy]*$/;
