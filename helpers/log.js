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

function log(message, level, ...args) {
  if (level === CUSTOM) {
    return;
  }

  const verbosity = vsc.settings.logLevel;
  if (typeof level === 'undefined') {
    level = vsc.settings.defaultLogLevel;
  }

  if (verbosity >= level) {
    if (level === ERROR) {
      console.log(`[FMVSC ERROR]: ${message}`, ...args);
    } else if (level === WARNING) {
      console.log(`[FMVSC WARNING]: ${message}`, ...args);
    } else if (level === INFO) {
      console.log(`[FMVSC INFO]: ${message}`, ...args);
    } else if (level === DEBUG) {
      console.log(`[FMVSC DEBUG]: ${message}`, ...args);
    } else if (level === TRACE) {
      console.log(`[FMVSC DEBUG (VERBOSE)]: ${message}`, ...args);
      console.trace();
    }
  }
}

function logGroup(groupName, level) {
  const verbosity = vsc.settings.logLevel;
  if (typeof level === 'undefined') {
    level = vsc.settings.defaultLogLevel;
  }

  if (verbosity >= level) {
    console.group(groupName);
  }
}

function logGroupEnd(level) {
  const verbosity = vsc.settings.logLevel;
  if (typeof level === 'undefined') {
    level = vsc.settings.defaultLogLevel;
  }

  if (verbosity >= level) {
    console.groupEnd();
  }
}

// vim: foldmethod=marker
