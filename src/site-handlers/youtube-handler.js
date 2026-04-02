/**
 * YouTube-specific handler
 */

import { map } from 'lodash-es';

window.VSC = window.VSC || {};

import { logger } from '../utils/logger.js';
import { BaseSiteHandler } from './base-handler.js';

export class YouTubeHandler extends BaseSiteHandler {
  constructor(settings) {
    super(settings);

    this.settings = settings;

    this.spb_enabled = this.settings.sites?.youtube?.spb_enabled;
    this.spb_skip = this.settings.sites?.youtube?.spb_skip;
  }

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

    // MyNote: upstream detects embedded YouTube via #player-controls and inserts
    // into the grandparent (#player) to fix a stacking context issue. Disabled
    // because #player-controls also exists on regular YouTube (ytd-video-preview),
    // causing wrong insertion point and YouTube crashes.
    // See: https://github.com/igrigorik/videospeed/commit/be7a896
    //
    // if (document.getElementById('player-controls')) {
    //   const playerContainer = targetParent.parentElement;
    //   if (playerContainer) {
    //     targetParent = playerContainer;
    //   }
    // }

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
  setup({ onHide, onShow, signal, spyDiv, video }) {
    super.setup();

    // Set up YouTube-specific CSS handling
    this.setupYouTubeCSS();

    this.onHide = onHide;
    this.onShow = onShow;
    this.signal = signal;
    this.spyDiv = spyDiv;
    this.video = video;

    this.target = video.closest('.html5-video-player');

    this.setupObserver();
  }

  setupObserver() {
    this.observer = new MutationObserver(() => {
      if (this.signal.aborted) {
        this.disconnect();
        return;
      }

      const shouldHide = getComputedStyle(this.spyDiv).getPropertyValue('--should-hide');
      if (shouldHide === 'yes') {
        this.onHide();
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
    return video.classList.contains('video-thumbnail') || video.parentElement?.classList.contains('ytp-ad-player-overlay');
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
   * Handles sponsored segments from the video that can be skipped
   * @returns {Array<{start: number, end: number}>} Array of segments with start and end times in seconds
   */
  async initSkipSegments() {
    if (!this.spb_enabled) {
      return [];
    }

    const videoId = new URL(location.href).searchParams.get('v');
    logger.info('[initSkipSegments] videoId', videoId);

    if (!videoId) {
      return [];
    }

    let segments = [];
    try {
      const res = await fetch(`https://sponsor.ajay.app/api/skipSegments?videoID=${videoId}`);
      const json = await res.json();
      segments = map(json, (r) => ({ start: Math.ceil(r.segment[0]), end: Math.floor(r.segment[1]) }));
    } catch (err) {
      logger.info('[initSkipSegments] error', err);
    }

    logger.info('[initSkipSegments] segments', segments);
    return segments;
  }
}

// Create singleton instance
window.VSC.YouTubeHandler = YouTubeHandler;
