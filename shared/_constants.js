/* Log levels (depends on caller specifying the correct level)
  1 - none
  2 - error
  3 - warning
  4 - info
  5 - debug
  6 - debug high verbosity + stack trace on each message
*/
const NONE = 1;
const ERROR = 2;
const WARNING = 3;
const INFO = 4;
const DEBUG = 5;
const TRACE = 6;

const CUSTOM = 10;

const REG_STRIP = /^[\r\t\f\v ]+|[\r\t\f\v ]+$/gm;
const REG_ENDS_WITH_FLAGS = /\/(?!.*(.).*\1)[gimsuy]*$/;
