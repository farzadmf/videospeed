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
