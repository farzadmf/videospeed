/**
 * Old Reddit handler
 */

window.VSC = window.VSC || {};

import { BaseSiteHandler } from './base-handler.js';

export class OldRedditHandler extends BaseSiteHandler {
  /**
   * Check if this handler applies to Apple TV+
   * @returns {boolean} True if on Apple TV+
   */
  static matches() {
    return location.hostname === 'old.reddit.com';
  }

  /**
   * Get old Reddit-specific controller positioning
   * @param {HTMLElement} parent - Parent element
   * @param {HTMLElement} video - Video element
   * @returns {Object} Positioning information
   */
  getControllerPosition(parent) {
    return {
      insertionPoint: parent.parentNode.parentNode,
      insertionMethod: 'firstChild',
      targetParent: parent.parentNode,
    };
  }

  /**
   * Check if video should be ignored on YouTube
   * @param {HTMLMediaElement} video - Video element
   * @returns {boolean} True if video should be ignored
   */
  shouldIgnoreVideo(video) {
    // Ignore portrait videos (seems to appear on the timeline?)
    return video.classList.contains('portrait') || video.classList.contains('landscape');
  }
}

// Create singleton instance
window.VSC.OldRedditHandler = OldRedditHandler;
