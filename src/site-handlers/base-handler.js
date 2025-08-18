/**
 * Base class for site-specific handlers
 */

window.VSC = window.VSC || {};

import { logger } from '../utils/logger.js';

export class BaseSiteHandler {
  constructor() {
    this.hostname = location.hostname;
  }

  /**
   * Check if this handler applies to the current site
   * @returns {boolean} True if handler applies
   */
  static matches() {
    return false; // Override in subclasses
  }

  /**
   * Get the site-specific positioning for the controller
   * @param {HTMLElement} parent - Parent element
   * @param {HTMLElement} video - Video element
   * @returns {Object} Positioning information
   */
  getControllerPosition(parent) {
    return {
      insertionPoint: parent,
      insertionMethod: 'firstChild', // 'firstChild', 'beforeParent', 'afterParent'
      targetParent: parent,
    };
  }

  /**
   * Handle site-specific seeking functionality
   * @param {HTMLMediaElement} video - Video element
   * @param {number} seekSeconds - Seconds to seek
   * @returns {boolean} True if handled, false for default behavior
   */
  handleSeek(video, seekSeconds) {
    logger.info('[handleSeek]', 'video', video, 'seekSeconds', seekSeconds);

    // Default implementation - use standard seeking with bounds checking (original logic)
    if (video.currentTime !== undefined && video.duration) {
      const newTime = Math.max(0, Math.min(video.duration, video.currentTime + seekSeconds));
      video.currentTime = newTime;
    } else {
      // Fallback for videos without duration
      video.currentTime += seekSeconds;
    }
    return true;
  }

  /**
   * Handle site-specific initialization
   * @param {Document} document - Document object
   */
  initialize() {
    logger.debug(`Initializing ${this.constructor.name} for ${this.hostname}`);
  }

  /**
   * Handle site-specific setup (observers, event listeners etc.)
   */
  setup() {
    logger.debug(`Setting up ${this.constructor.name} for ${this.hostname}`);
  }

  /**
   * Handle site-specific cleanup
   */
  cleanup() {
    logger.debug(`Cleaning up ${this.constructor.name}`);
  }

  /**
   * Check if video element should be ignored
   * @param {HTMLMediaElement} video - Video element
   * @returns {boolean} True if video should be ignored
   */
  shouldIgnoreVideo() {
    return false;
  }

  /**
   * Get site-specific CSS selectors for video containers
   * @returns {Array<string>} CSS selectors
   */
  getVideoContainerSelectors() {
    return [];
  }

  /**
   * Handle special video detection logic
   * @param {Document} document - Document object
   * @returns {Array<HTMLMediaElement>} Additional videos found
   */
  detectSpecialVideos() {
    return [];
  }
}

// Create singleton instance
window.VSC.BaseSiteHandler = BaseSiteHandler;
