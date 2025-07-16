/**
 * Apple TV+ handler
 * Modular architecture using global variables
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
  getControllerPosition(parent, _video) {
    return {
      insertionPoint: parent.parentNode.parentNode,
      insertionMethod: 'firstChild',
      targetParent: parent.parentNode,
    };
  }
}

// Create singleton instance
window.VSC.OldRedditHandler = OldRedditHandler;
