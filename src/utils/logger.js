/**
 * Logging utility for Video Speed Controller
 */

// window.VSC = window.VSC || {};

import { LOG_LEVELS } from '../shared/constants.js';

class Logger {
  constructor() {
    this.verbosity = LOG_LEVELS.WARNING;
    this.defaultLevel = LOG_LEVELS.INFO;
    this.contextStack = []; // Stack for nested contexts
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
   * Generate video/controller context string from context stack
   * @returns {string} Context string like "[V1]" or ""
   * @private
   */
  _generateContext() {
    if (this.contextStack.length > 0) {
      return `[${this.contextStack[this.contextStack.length - 1]}] `;
    }
    return '';
  }

  /**
   * Format video element identifier using controller ID
   * @param {HTMLMediaElement} video - Video element
   * @returns {string} Formatted ID like "V1" or "A1"
   * @private
   */
  _formatVideoId(video) {
    if (!video) return 'V?';

    const isAudio = video.tagName === 'AUDIO';
    const prefix = isAudio ? 'A' : 'V';

    // Use controller ID if available (this is what we want!)
    if (video.vsc?.controllerId) {
      return `${prefix}${video.vsc.controllerId}`;
    }

    // Fallback for videos without controllers
    return `${prefix}?`;
  }

  /**
   * Push context onto stack (for nested operations)
   * @param {string|HTMLMediaElement} context - Context string or video element
   * @private
   */
  _pushContext(context) {
    if (typeof context === 'string') {
      this.contextStack.push(context);
    } else if (context && (context.tagName === 'VIDEO' || context.tagName === 'AUDIO')) {
      this.contextStack.push(this._formatVideoId(context));
    }
  }

  /**
   * Pop context from stack
   * @private
   */
  _popContext() {
    this.contextStack.pop();
  }

  /**
   * Execute function with context
   * @param {string|HTMLMediaElement} context - Context string or video element
   * @param {Function} fn - Function to execute
   * @returns {*} Function result
   */
  withContext(context, fn) {
    this._pushContext(context);
    try {
      return fn();
    } finally {
      this._popContext();
    }
  }

  /**
   * Log a message with specified level
   * @param {string} message - Message to log
   * @param {number} level - Log level (optional, uses default if not specified)
   */
  log(level, ...message) {
    const logLevel = typeof level === 'undefined' ? this.defaultLevel : level;

    if (this.verbosity >= logLevel) {
      const context = this._generateContext();

      const trace = new Error().stack;

      switch (logLevel) {
        case LOG_LEVELS.ERROR:
          console.log('%c[FMVSC] ERR |', 'color: red', context, ...message, trace);
          break;
        case LOG_LEVELS.WARNING:
          console.log('%c[FMVSC] WRN |', 'color: yellow', context, ...message);
          break;
        case LOG_LEVELS.INFO:
          console.log('%c[FMVSC] INF |', 'color:  green', context, ...message);
          break;
        case LOG_LEVELS.DEBUG:
          console.log('%c[FMVSC] DBG |', 'color: cyan', context, ...message);
          break;
        case LOG_LEVELS.VERBOSE:
          console.log('%c[FMVSC] VRB |', 'color: magenta', context, ...message);
          console.trace();
          break;
        default:
          console.log('[FMVSC]', context, ...message);
      }
    }
  }

  /**
   * Log error message
   * @param {string} message - Error message
   */
  error(...message) {
    this.log(LOG_LEVELS.ERROR, ...message);
  }

  /**
   * Log warning message
   * @param {string} message - Warning message
   */
  warn(...message) {
    this.log(LOG_LEVELS.WARNING, ...message);
  }

  /**
   * Log info message
   * @param {string} message - Info message
   */
  info(...message) {
    this.log(LOG_LEVELS.INFO, ...message);
  }

  /**
   * Log debug message
   * @param {string} message - Debug message
   */
  debug(...message) {
    this.log(LOG_LEVELS.DEBUG, ...message);
  }

  /**
   * Log verbose debug message with stack trace
   * @param {string} message - Verbose debug message
   */
  verbose(...message) {
    this.log(LOG_LEVELS.VERBOSE, ...message);
  }
}

export const logger = new Logger();

// Create singleton instance
// window.VSC.logger = new Logger();
