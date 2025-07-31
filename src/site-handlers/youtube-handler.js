/**
 * YouTube-specific handler
 * Modular architecture using global variables
 */

window.VSC = window.VSC || {};

import { logger } from '../utils/logger.js';
import { BaseSiteHandler } from './base-handler.js';

export class YouTubeHandler extends BaseSiteHandler {
  /**
   * Check if this handler applies to YouTube
   * @returns {boolean} True if on YouTube
   */
  static matches() {
    return location.hostname === 'www.youtube.com';
  }

  /**
   * Get YouTube-specific controller positioning
   * @param {HTMLElement} parent - Parent element
   * @param {HTMLElement} video - Video element
   * @returns {Object} Positioning information
   */
  getControllerPosition(parent) {
    // YouTube requires special positioning to ensure controller is on top
    const targetParent = parent.parentElement;

    return {
      insertionPoint: targetParent,
      insertionMethod: 'firstChild',
      targetParent: targetParent,
    };
  }

  /**
   * Initialize YouTube-specific functionality
   * @param {Document} document - Document object
   */
  initialize(document) {
    super.initialize(document);

    // Set up YouTube-specific CSS handling
    this.setupYouTubeCSS();
  }

  /**
   * Set up YouTube-specific functionality
   */
  setup({ onShow, onHide, video }) {
    super.setup();

    // Set up YouTube-specific CSS handling
    this.setupYouTubeCSS();

    this.video = video;
    this.onShow = onShow;
    this.onHide = onHide;
    this.target = video.closest('.html5-video-player');
    this.setupObserver();
  }

  setupObserver() {
    this.mouseMoveTimer = null;
    this.isMouseIn = false;

    // Using mouse movement as an indication to know if it's intended to show VSC.
    this.mouseMove = () => {
      clearTimeout(this.mouseMoveTimer);
      this.isMouseIn = true;

      this.mouseMoveTimer = setTimeout(() => (this.isMouseIn = false), 250);
    };
    this.video.addEventListener('mousemove', this.mouseMove);

    this.observer = new MutationObserver(() => {
      if (this.target.classList.contains('ytp-autohide')) {
        if (!this.isMouseIn) {
          this.onHide();
        } else {
          // This else is basically covering this edge case:
          // - When we hover over VSC, since it's a different element on top, YT adds
          //   ytp-autohide, so if we call onHide, while we're hovering over VSC, it will
          //   disappear on us!
          // - Because of that, we stop observing at this point and wait for mouseenter
          //   (which happens when VSC is closed/navigated away) to observe again.
          this.disconnect();
          this.video.addEventListener('mouseenter', () => this.observe());
        }
      } else {
        this.onShow();
      }
    });

    this.observe();
  }

  observe() {
    this.observer.observe(this.target, { attributes: true, attributeFilter: ['class'] });
  }

  disconnect() {
    this.observer.disconnect();
  }

  /**
   * Handle site-specific cleanup
   */
  cleanup() {
    super.cleanup();

    this.observer?.disconnect();
  }

  /**
   * Set up YouTube-specific CSS classes and positioning
   * @private
   */
  setupYouTubeCSS() {
    // YouTube has complex CSS that can hide our controller
    // The inject.css already handles this, but we could add dynamic adjustments here
    logger.debug('YouTube CSS setup completed');
  }

  /**
   * Check if video should be ignored on YouTube
   * @param {HTMLMediaElement} video - Video element
   * @returns {boolean} True if video should be ignored
   */
  shouldIgnoreVideo(video) {
    // Ignore thumbnail videos and ads
    return (
      video.classList.contains('video-thumbnail') ||
      video.parentElement?.classList.contains('ytp-ad-player-overlay')
    );
  }

  /**
   * Get YouTube-specific video container selectors
   * @returns {Array<string>} CSS selectors
   */
  getVideoContainerSelectors() {
    return ['.html5-video-player', '#movie_player', '.ytp-player-content'];
  }

  /**
   * Handle special video detection for YouTube
   * @param {Document} document - Document object
   * @returns {Array<HTMLMediaElement>} Additional videos found
   */
  detectSpecialVideos(document) {
    const videos = [];

    // Look for videos in iframes (embedded players)
    try {
      const iframes = document.querySelectorAll('iframe[src*="youtube.com"]');
      iframes.forEach((iframe) => {
        try {
          const iframeDoc = iframe.contentDocument;
          if (iframeDoc) {
            const iframeVideos = iframeDoc.querySelectorAll('video');
            videos.push(...Array.from(iframeVideos));
          }
        } catch {
          // Cross-origin iframe, ignore
        }
      });
    } catch (e) {
      logger.debug(`Could not access YouTube iframe videos: ${e.message}`);
    }

    return videos;
  }

  /**
   * Handle YouTube-specific player state changes
   * @param {HTMLMediaElement} video - Video element
   */
  onPlayerStateChange() {
    // YouTube fires custom events we could listen to
    // This could be used for better integration with YouTube's player
    logger.debug('YouTube player state changed');
  }
}

// Create singleton instance
window.VSC.YouTubeHandler = YouTubeHandler;
