/**
 * Logging utility for Video Speed Controller
 * Modular architecture using global variables
 */

window.VSC = window.VSC || {};

class Logger {
  constructor() {
    this.verbosity = 3; // Default warning level
    this.defaultLevel = 4; // Default info level
  }

  /**
   * Set logging verbosity level
   * @param {number} level - Log level from LOG_LEVELS constants
   */
  setVerbosity(level) {
    this.verbosity = level;
  }

  /**
   * Set default logging level
   * @param {number} level - Default level from LOG_LEVELS constants
   */
  setDefaultLevel(level) {
    this.defaultLevel = level;
  }

  /**
   * Log a message with specified level
   * @param {string} message - Message to log
   * @param {number} level - Log level (optional, uses default if not specified)
   */
  log(level, ...message) {
    const logLevel = typeof level === 'undefined' ? this.defaultLevel : level;
    const LOG_LEVELS = window.VSC.Constants.LOG_LEVELS;

    const consoleLog = (...msg) => console.log('[FMVSC]', ...msg);

    if (this.verbosity >= logLevel) {
      switch (logLevel) {
        case LOG_LEVELS.ERROR:
          consoleLog('ERR |', ...message);
          break;
        case LOG_LEVELS.WARNING:
          consoleLog('WRN |', ...message);
          break;
        case LOG_LEVELS.INFO:
          consoleLog('INF |', ...message);
          break;
        case LOG_LEVELS.DEBUG:
          consoleLog('DBG |', ...message);
          break;
        case LOG_LEVELS.VERBOSE:
          consoleLog('VRB |', ...message);
          console.trace();
          break;
        default:
          consoleLog(...message);
      }
    }
  }

  /**
   * Log error message
   * @param {string} message - Error message
   */
  error(...message) {
    this.log(window.VSC.Constants.LOG_LEVELS.ERROR, ...message);
  }

  /**
   * Log warning message
   * @param {string} message - Warning message
   */
  warn(...message) {
    this.log(window.VSC.Constants.LOG_LEVELS.WARNING, ...message);
  }

  /**
   * Log info message
   * @param {string} message - Info message
   */
  info(...message) {
    this.log(window.VSC.Constants.LOG_LEVELS.INFO, ...message);
  }

  /**
   * Log debug message
   * @param {string} message - Debug message
   */
  debug(...message) {
    this.log(window.VSC.Constants.LOG_LEVELS.DEBUG, ...message);
  }

  /**
   * Log verbose debug message with stack trace
   * @param {string} message - Verbose debug message
   */
  verbose(...message) {
    this.log(window.VSC.Constants.LOG_LEVELS.VERBOSE, ...message);
  }
}

// Create singleton instance
window.VSC.logger = new Logger();

// Global variables available for both browser and testing
