/**
 * YouTube-specific handler
 */

import { map } from 'lodash-es';

window.VSC = window.VSC || {};

import { logger } from '../utils/logger.js';
import { playBeep } from '../utils/sound.js';
import { BaseSiteHandler } from './base-handler.js';

export class YouTubeHandler extends BaseSiteHandler {
  constructor(settings) {
    super(settings);

    this.settings = settings;

    const yt = this.settings.sites.youtube;
    this.spb_sound_enabled = yt.spb_sound_enabled;
    this.spb_skip_sound = yt.spb_skip_sound;
    this.spb_unskip_sound = yt.spb_unskip_sound;
    this.spb_enabled = yt.spb_enabled;
    this.spb_interval = yt.spb_interval;
    this.spb_skip = yt.spb_skip;

    this.segments = [];
    this.skipHistory = [];
    this.skippedSegmentIds = new Set();
    this.skipSegmentsIntervalId = null;
    this.handleTimeUpdateForSkip = null;
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
    // UPSTREAM UPDATE: now scopes the query to targetParent.parentElement to avoid
    // falsely matching a global #player-controls on the desktop site.
    //
    // if (
    //   targetParent &&
    //   targetParent.parentElement &&
    //   targetParent.parentElement.querySelector('#player-controls')
    // ) {
    //   targetParent = targetParent.parentElement;
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
  setup({ onHide, onShow, shadowManager, signal, spyDiv, video }) {
    super.setup();

    // Set up YouTube-specific CSS handling
    this.setupYouTubeCSS();

    this.onHide = onHide;
    this.onShow = onShow;
    this.shadowManager = shadowManager;
    this.signal = signal;
    this.spyDiv = spyDiv;
    this.video = video;

    this.target = video.closest('.html5-video-player');

    this.setupObserver();
    this.startSkipSegments();
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
    this.stopSkipSegments();
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

  /**
   * Start skip-segment monitoring: periodic API fetch + timeupdate listener for auto-skip.
   */
  startSkipSegments() {
    this.stopSkipSegments();

    const fetchAndUpdate = async () => {
      const newSegments = await this.initSkipSegments();

      const changed =
        newSegments.length !== this.segments.length ||
        newSegments.some((s, i) => s.start !== this.segments[i].start || s.end !== this.segments[i].end);

      if (!changed) {
        return;
      }

      this.shadowManager.clearSkipSegments();
      this.segments = newSegments;
      this.shadowManager.addSkipSegments({ totalDuration: this.video.duration, segments: this.segments });
    };

    const startInterval = () => {
      fetchAndUpdate();

      if (this.spb_interval && this.spb_interval > 0) {
        this.skipSegmentsIntervalId = setInterval(fetchAndUpdate, this.spb_interval * 1000);
      }
    };

    this.handleTimeUpdateForSkip = () => this.checkSkipSegments();
    this.video.addEventListener('timeupdate', this.handleTimeUpdateForSkip);

    if (this.video.readyState === HTMLMediaElement.HAVE_ENOUGH_DATA) {
      startInterval();
    } else {
      this.video.addEventListener('canplaythrough', () => startInterval(), { once: true });
    }
  }

  /**
   * Stop skip-segment monitoring and clean up timers/listeners.
   */
  stopSkipSegments() {
    if (this.skipSegmentsIntervalId !== null) {
      clearInterval(this.skipSegmentsIntervalId);
      this.skipSegmentsIntervalId = null;
    }

    if (this.handleTimeUpdateForSkip && this.video) {
      this.video.removeEventListener('timeupdate', this.handleTimeUpdateForSkip);
      this.handleTimeUpdateForSkip = null;
    }
  }

  /**
   * Manually skip the current sponsor segment.
   * Also re-skips segments after an undo. Pushes to skipHistory so undo still works.
   * @param {HTMLMediaElement} video - Video element
   */
  doSkip(video) {
    const currentTime = video.currentTime;

    // Find segment we're currently inside, or the next upcoming one
    const segment =
      this.segments.find((s) => currentTime >= s.start && currentTime < s.end) ||
      this.segments.find((s) => s.start > currentTime);

    if (!segment) {
      return;
    }

    const segmentId = `${segment.start}:${segment.end}`;
    logger.info(`[doSkip] Skipping segment ${segmentId} (${segment.start}s → ${segment.end}s)`);

    this.skipHistory.push({ position: currentTime, segment });
    this.skippedSegmentIds.add(segmentId);
    video.currentTime = segment.end;

    if (this.spb_sound_enabled) {
      const soundUrl = window.VSC._soundUrls?.[this.spb_skip_sound];
      playBeep(soundUrl, video.muted ? 0 : video.volume);
    }
  }

  /**
   * Undo the last auto-skip by seeking back.
   * The segment stays in skippedSegmentIds to prevent auto-re-skip;
   * use doSkip to manually re-skip.
   * @param {HTMLMediaElement} video - Video element
   */
  undoSkip(video) {
    if (this.skipHistory.length === 0) {
      return;
    }

    const entry = this.skipHistory.pop();
    video.currentTime = entry.position;
    logger.info(`[undoSkip] Seeking back to ${entry.position}`);

    if (this.spb_sound_enabled) {
      const soundUrl = window.VSC._soundUrls?.[this.spb_unskip_sound];
      playBeep(soundUrl, video.muted ? 0 : video.volume);
    }
  }

  /**
   * Check if current playback position falls within a sponsor segment and auto-skip.
   * @private
   */
  checkSkipSegments() {
    if (!this.spb_skip || !this.video) {
      return;
    }

    const currentTime = this.video.currentTime;

    for (const segment of this.segments) {
      const segmentId = `${segment.start}:${segment.end}`;

      if (this.skippedSegmentIds.has(segmentId)) {
        continue;
      }

      if (currentTime >= segment.start && currentTime < segment.end) {
        logger.info(`[checkSkipSegments] Skipping segment ${segmentId} (${segment.start}s → ${segment.end}s)`);

        this.skipHistory.push({ position: currentTime, segment });
        this.skippedSegmentIds.add(segmentId);
        this.video.currentTime = segment.end;

        if (this.spb_sound_enabled) {
          const soundUrl = window.VSC._soundUrls?.[this.spb_skip_sound];
          playBeep(soundUrl, this.video.muted ? 0 : this.video.volume);
        }

        break;
      }
    }
  }
}

// Create singleton instance
window.VSC.YouTubeHandler = YouTubeHandler;
