/**
 * Logging utility for Video Speed Controller
 * Modular architecture using global variables
 */

window.VSC = window.VSC || {};

import { LOG_LEVELS } from '../shared/constants.js';

class Logger {
  constructor() {
    this.verbosity = LOG_LEVELS.WARNING;
    this.defaultLevel = LOG_LEVELS.INFO;
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

    if (this.verbosity >= logLevel) {
      const trace = new Error().stack;

      switch (logLevel) {
        case LOG_LEVELS.ERROR:
          console.log('%c[FMVSC] ERR |', 'color: red', ...message, trace);
          break;
        case LOG_LEVELS.WARNING:
          console.log('%c[FMVSC] WRN |', 'color: yellow', ...message);
          break;
        case LOG_LEVELS.INFO:
          console.log('%c[FMVSC] INF |', 'color:  green', ...message);
          break;
        case LOG_LEVELS.DEBUG:
          console.log('%c[FMVSC] DBG |', 'color: cyan', ...message);
          break;
        case LOG_LEVELS.VERBOSE:
          console.log('%c[FMVSC] VRB |', 'color: magenta', ...message);
          console.trace();
          break;
        default:
          console.log('[FMVSC]', ...message);
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

export const logger = new Logger();

// Create singleton instance
window.VSC.logger = new Logger();

// Global variables available for both browser and testing
