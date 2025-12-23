/**
 * Site handler factory and manager
 */

window.VSC = window.VSC || {};

import { logger } from '../utils/logger.js';
import { AmazonHandler } from './amazon-handler.js';
import { AppleHandler } from './apple-handler.js';
import { BaseSiteHandler } from './base-handler.js';
import { FacebookHandler } from './facebook-handler.js';
import { NetflixHandler } from './netflix-handler.js';
import { YouTubeHandler } from './youtube-handler.js';

export class SiteHandlerManager {
  constructor(settings) {
    this.currentHandler = null;
    this.availableHandlers = [AmazonHandler, AppleHandler, FacebookHandler, NetflixHandler, YouTubeHandler];
    this.settings = settings;
  }

  /**
   * Get the appropriate handler for the current site
   * @returns {BaseSiteHandler} Site handler instance
   */
  getCurrentHandler() {
    if (!this.currentHandler) {
      this.currentHandler = this.detectHandler();
    }
    return this.currentHandler;
  }

  /**
   * Detect which handler to use for the current site
   * @returns {BaseSiteHandler} Site handler instance
   * @private
   */
  detectHandler() {
    for (const HandlerClass of this.availableHandlers) {
      if (HandlerClass.matches()) {
        logger.info(`Using ${HandlerClass.name} for ${location.hostname}`);
        return new HandlerClass(this.settings);
      }
    }

    logger.debug(`Using BaseSiteHandler for ${location.hostname}`);
    return new BaseSiteHandler();
  }

  /**
   * Initialize the current site handler
   * @param {Document} document - Document object
   */
  initialize(document) {
    const handler = this.getCurrentHandler();
    handler.initialize(document);
  }

  /**
   * Initialize the current site handler
   */
  setup({ onHide, onShow, signal, spyDiv, video }) {
    const handler = this.getCurrentHandler();
    handler.setup({ onHide, onShow, signal, spyDiv, video });
  }

  /**
   * Get controller positioning for current site
   * @param {HTMLElement} parent - Parent element
   * @param {HTMLElement} video - Video element
   * @returns {Object} Positioning information
   */
  getControllerPosition(parent, video) {
    const handler = this.getCurrentHandler();
    return handler.getControllerPosition(parent, video);
  }

  /**
   * Handle seeking for current site
   * @param {HTMLMediaElement} video - Video element
   * @param {number} seekSeconds - Seconds to seek
   * @returns {boolean} True if handled
   */
  handleSeek(video, seekSeconds) {
    const handler = this.getCurrentHandler();
    return handler.handleSeek(video, seekSeconds);
  }

  /**
   * Check if a video should be ignored
   * @param {HTMLMediaElement} video - Video element
   * @returns {boolean} True if video should be ignored
   */
  shouldIgnoreVideo(video) {
    const handler = this.getCurrentHandler();
    return handler.shouldIgnoreVideo(video);
  }

  /**
   * Get video container selectors for current site
   * @returns {Array<string>} CSS selectors
   */
  getVideoContainerSelectors() {
    const handler = this.getCurrentHandler();
    return handler.getVideoContainerSelectors();
  }

  /**
   * Detect special videos for current site
   * @param {Document} document - Document object
   * @returns {Array<HTMLMediaElement>} Additional videos found
   */
  detectSpecialVideos(document) {
    const handler = this.getCurrentHandler();
    return handler.detectSpecialVideos(document);
  }

  /**
   * Cleanup current handler
   */
  cleanup() {
    if (this.currentHandler) {
      this.currentHandler.cleanup();
      this.currentHandler = null;
    }
  }

  /**
   * Force refresh of current handler (useful for SPA navigation)
   */
  refresh() {
    this.cleanup();
    this.currentHandler = null;
  }

  /**
   * Handles sponsored segments from the video that can be skipped
   */
  async initSkipSegments() {
    const handler = this.getCurrentHandler();
    return await handler.initSkipSegments();
  }
}

// Create singleton instance
window.VSC.siteHandlerManager = new SiteHandlerManager();
