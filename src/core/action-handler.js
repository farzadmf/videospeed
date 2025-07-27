/**
 * Action handling system for Video Speed Controller
 * Modular architecture using global variables
 *
 * @typedef {import('./video-controller.js').VideoController} VideoController
 * @typedef {import('./config.js').VideoSpeedConfig} VideoSpeedConfig
 * @typedef {import('../utils/event-manager.js').EventManager} EventManager
 */

window.VSC = window.VSC || {};

import { logger } from '../utils/logger.js';
import { getBaseURL } from '../utils/url.js';
import { siteHandlerManager } from '../site-handlers/manager.js';
import { SPEED_LIMITS } from '../shared/constants.js';
import { DragHandler } from '../ui/drag-handler.js';
import { formatSpeed } from '../shared/constants.js';

export class ActionHandler {
  /**
   * @param {VideoSpeedConfig} config - Config handler
   * @param {EventManager} eventManager - Event manager
   */
  constructor(config, eventManager) {
    this.config = config;
    this.eventManager = eventManager;
  }

  /**
   * Execute an action on media elements
   * @param {string} action - Action to perform
   * @param {*} value - Action value
   * @param {Event} e - Event object (optional)
   */
  runAction({ actionItem, event }) {
    logger.debug('runAction Begin:', actionItem);

    const mediaTags = this.config.getMediaElements();

    let value, value2;
    let actionName = '';
    if (typeof actionItem === 'string') {
      // For "built-in" actions (such as blink, drag etc.) that have no
      // binding, setting, key, etc.
      actionName = actionItem;
    } else {
      actionName = actionItem.action.name;
      value = actionItem.value || actionItem.action.value;
      value2 = actionItem.value2 || actionItem.action.value2;
    }

    // Get the controller that was used if called from a button press event
    let targetController = null;
    if (event) {
      targetController = event.target.getRootNode().host;
    }

    if (actionName === 'dragprog') {
      return this.executeAction({ actionName, value, value2, video: targetController, event });
    }

    // Return true (meaning: "we handled it") if the action applied to at least one of our media elements
    const result = mediaTags.some((video) => {
      const controller = video.vsc?.div;

      if (!controller) {
        return false; // We didn't handle it
      }

      // Don't change video speed if the video has a different controller
      // Only apply this check for button clicks (when targetController is set)
      if (event && targetController && !(targetController === controller)) {
        return false; // We didn't handle it
      }

      if (!video.currentSrc && !video.src) {
        logger.debug('runAction not handling because src is empty', video);
        return false; // We didn't handle it
      }

      this.eventManager.showController(controller);

      if (!video.classList.contains('vsc-cancelled')) {
        return this.executeAction({ actionName, value, value2, video, event });
      }
    });

    logger.debug('runAction End');

    return result;
  }

  /**
   * Execute specific action on a video element
   * @param {string} action - Action to perform
   * @param {*} value - Action value
   * @param {HTMLMediaElement} video - Video element
   * @param {Event} e - Event object (optional)
   * @private
   */
  executeAction({ actionName, value, value2, video, event }) {
    const percent = (value * video.duration) / 100;
    const step = Math.min(value2 || 5, percent); // Only used for rewind and advance

    if (actionName.startsWith('fixspeed')) {
      const speedStr = actionName.split('_')[1];
      const speedValue = Number(`${speedStr[0]}.${speedStr[1]}`);
      this.adjustSpeed(video, speedValue);
      return true;
    }

    switch (actionName) {
      case 'rewind':
        logger.debug('Rewind');
        this.seek(video, -step);
        break;

      case 'advance':
        logger.debug('Fast forward');
        this.seek(video, step);
        return true;

      case 'faster':
        logger.debug('Increase speed');
        this.adjustSpeed(video, value, { relative: true });
        return true;

      case 'slower': {
        logger.debug('Decrease speed');
        this.adjustSpeed(video, -value, { relative: true });
        return true;
      }

      case 'reset':
        logger.debug('Reset speed');
        this.resetSpeed(video, 1.0);
        return true;

      case 'display': {
        logger.debug('Display action triggered');
        const controller = video.vsc.div;

        // MyNote: this is checked in runAction, so do we need it here?!
        // if (!controller) {
        //   logger.error('No controller found for video');
        //   return;
        // }

        controller.classList.add('vsc-manual');
        controller.classList.toggle('vsc-hidden');

        // Clear inline fallback styles to prevent conflicts with CSS classes
        if (controller.classList.contains('vsc-manual')) {
          controller.style.removeProperty('display');
          controller.style.removeProperty('visibility');
          controller.style.removeProperty('opacity');
          logger.debug('Cleared inline fallback styles for manual toggle');
        }

        return true;
      }

      case 'blink':
        logger.debug('Showing controller momentarily');
        this.blinkController(video.vsc.div, value);
        return true;

      case 'drag':
        DragHandler.handleDrag(video, event);
        return true;

      case 'dragprog':
        DragHandler.handleDrag(video, event);
        return true;

      case 'fast':
        this.resetSpeed(video, value);
        return true;

      case 'pause':
        this.pause(video);
        return true;

      case 'muted':
        this.muted(video);
        return true;

      case 'vol_up':
        this.volumeUp(video, value);
        return true;

      case 'vol_down':
        this.volumeDown(video, value);
        return true;

      case 'mark':
        this.setMark(video);
        return true;

      case 'jump':
        this.jumpToMark(video);
        return true;

      case 'SET_SPEED':
        logger.info('Setting speed to:', value);
        this.adjustSpeed(video, value);
        return true;

      case 'ADJUST_SPEED':
        logger.info('Adjusting speed by:', value);
        this.adjustSpeed(video, value, { relative: true });
        return true;

      case 'RESET_SPEED': {
        logger.info('Resetting speed');
        const preferredSpeed = this.config.getSpeedStep('fast');
        this.adjustSpeed(video, preferredSpeed);
        return true;
      }

      default:
        logger.warn(`Unknown action: ${actionName}`);
        return false;
    }
  }

  /**
   * Adjust video playback speed (absolute or relative)
   *
   * @param {HTMLMediaElement} video - Target video element
   * @param {number} value - Speed value (absolute) or delta (relative)
   * @param {Object} options - Configuration options
   * @param {boolean} options.relative - If true, value is a delta; if false, absolute speed
   * @param {string} options.source - 'internal' (user action) or 'external' (site/other)
   */
  adjustSpeed(video, value, options = {}) {
    logger.debug(`adjustSpeed started: ${value}`);

    const { relative = false } = options;

    const src = video?.currentSrc || video?.src;
    if (!src) {
      logger.warn('adjustSpeed called on video without controller');
      return;
    }

    const url = getBaseURL(src);

    let targetSpeed;
    if (value === undefined) {
      if (this.config.settings.forceLastSavedSpeed) {
        targetSpeed = this.config.settings.sources[url]?.speed || 1;
      }
    } else {
      if (relative) {
        const currentSpeed = video.playbackRate < 0.1 ? 0.0 : video.playbackRate;
        targetSpeed = currentSpeed + value;
      } else {
        targetSpeed = value;
      }
    }

    targetSpeed = Math.min(Math.max(targetSpeed, SPEED_LIMITS.MIN), SPEED_LIMITS.MAX);
    const numericSpeed = Number(targetSpeed.toFixed(1));

    video.playbackRate = numericSpeed;

    video.vsc?.setSpeedVal(numericSpeed);

    this.config.syncSpeedValue({
      speed: numericSpeed,
      url,
    });

    logger.debug(`adjustSpeed finished: ${value}`);
  }

  /**
   * Seek video by specified seconds
   * @param {HTMLMediaElement} video - Video element
   * @param {number} seekSeconds - Seconds to seek
   */
  seek(video, seekSeconds) {
    // Use site-specific seeking (handlers return true if they handle it)
    siteHandlerManager.handleSeek(video, seekSeconds);
  }

  /**
   * Toggle pause/play
   * @param {HTMLMediaElement} video - Video element
   */
  pause(video) {
    if (video.paused) {
      logger.debug('Resuming video');
      video.play();
    } else {
      logger.debug('Pausing video');
      video.pause();
    }
  }

  /**
   * Reset speed with toggle functionality
   * @param {HTMLMediaElement} video - Video element
   * @param {number} target - Target speed
   */
  resetSpeed(video, target) {
    if (video.playbackRate === target) {
      if (video.playbackRate === this.config.getKeyBinding('reset')) {
        if (target !== 1.0) {
          logger.info('Resetting playback speed to 1.0');
          this.adjustSpeed(video, 1.0);
        } else {
          logger.info('Toggling playback speed to "fast" speed');
          this.adjustSpeed(video, this.config.getKeyBinding('fast'));
        }
      } else {
        logger.info('Toggling playback speed to "reset" speed');
        this.adjustSpeed(video, this.config.getKeyBinding('reset'));
      }
    } else {
      logger.info('Toggling playback speed to "reset" speed');
      this.config.setKeyBinding('reset', video.playbackRate);
      this.adjustSpeed(video, target);
    }
  }

  /**
   * Toggle mute
   * @param {HTMLMediaElement} video - Video element
   */
  muted(video) {
    video.muted = video.muted !== true;
  }

  /**
   * Increase volume
   * @param {HTMLMediaElement} video - Video element
   * @param {number} value - Amount to increase
   */
  volumeUp(video, value) {
    video.volume = Math.min(1, (video.volume + value).toFixed(2));
  }

  /**
   * Decrease volume
   * @param {HTMLMediaElement} video - Video element
   * @param {number} value - Amount to decrease
   */
  volumeDown(video, value) {
    video.volume = Math.max(0, (video.volume - value).toFixed(2));
  }

  /**
   * Set time marker
   * @param {HTMLMediaElement} video - Video element
   */
  setMark(video) {
    logger.debug('Adding marker');
    video.vsc.mark = video.currentTime;
  }

  /**
   * Jump to time marker
   * @param {HTMLMediaElement} video - Video element
   */
  jumpToMark(video) {
    logger.debug('Recalling marker');
    if (video.vsc.mark && typeof video.vsc.mark === 'number') {
      video.currentTime = video.vsc.mark;
    }
  }

  /**
   * Show controller briefly
   * @param {HTMLElement} controller - Controller element
   * @param {number} duration - Duration in ms (default 1000)
   */
  blinkController(controller, duration) {
    // Don't hide audio controllers after blinking - audio elements are often invisible by design
    // but should maintain visible controllers for user interaction
    const isAudioController = this.isAudioController(controller);

    if (controller.classList.contains('vsc-hidden') || controller.blinkTimeOut !== undefined) {
      clearTimeout(controller.blinkTimeOut);
      controller.classList.remove('vsc-hidden');

      // For audio controllers, don't set timeout to hide again
      if (!isAudioController) {
        controller.blinkTimeOut = setTimeout(
          () => {
            controller.classList.add('vsc-hidden');
            controller.blinkTimeOut = undefined;
          },
          duration ? duration : 1000
        );
      } else {
        logger.debug('Audio controller blink - keeping visible');
      }
    }
  }

  /**
   * Check if controller is associated with an audio element
   * @param {HTMLElement} controller - Controller element
   * @returns {boolean} True if associated with audio element
   * @private
   */
  isAudioController(controller) {
    // Find associated media element
    const mediaElements = this.config.getMediaElements();
    for (const media of mediaElements) {
      if (media.vsc && media.vsc.div === controller) {
        return media.tagName === 'AUDIO';
      }
    }
    return false;
  }

  /**
   * Adjust video playback speed (absolute or relative)
   *
   * @param {HTMLMediaElement} video - Target video element
   * @param {number} value - Speed value (absolute) or delta (relative)
   * @param {Object} options - Configuration options
   * @param {boolean} options.relative - If true, value is a delta; if false, absolute speed
   * @param {string} options.source - 'internal' (user action) or 'external' (site/other)
   */
  adjustSpeed_upstream(video, value, options = {}) {
    const { relative = false, source = 'internal' } = options;

    // Validate input
    if (!video || !video.vsc) {
      logger.warn('adjustSpeed called on video without controller');
      return;
    }

    if (typeof value !== 'number' || isNaN(value)) {
      logger.warn('adjustSpeed called with invalid value:', value);
      return;
    }

    // Calculate target speed
    let targetSpeed;
    if (relative) {
      // For relative changes, add to current speed
      const currentSpeed = video.playbackRate < 0.1 ? 0.0 : video.playbackRate;
      targetSpeed = currentSpeed + value;
    } else {
      // For absolute changes, use value directly
      targetSpeed = value;
    }

    // Clamp to valid range
    targetSpeed = Math.min(Math.max(targetSpeed, SPEED_LIMITS.MIN), SPEED_LIMITS.MAX);

    // Round to 2 decimal places to avoid floating point issues
    targetSpeed = Number(targetSpeed.toFixed(2));

    // Handle force mode for external changes
    if (source === 'external' && this.config.settings.forceLastSavedSpeed) {
      // In force mode, reject external changes by restoring user preference
      targetSpeed = this._getUserPreferredSpeed_upstream(video);
      logger.debug(`Force mode: blocking external change, restoring to ${targetSpeed}`);
    }

    // Apply the speed change
    this._commitSpeedChange_upstream(video, targetSpeed, source);
  }

  /**
   * Get user's preferred speed for a video based on settings
   * @param {HTMLMediaElement} video - Video element
   * @returns {number} Preferred speed
   * @private
   */
  _getUserPreferredSpeed_upstream(video) {
    if (this.config.settings.rememberSpeed) {
      // Global mode - use lastSpeed for all videos
      return this.config.settings.lastSpeed || 1.0;
    } else {
      // Per-video mode - use stored speed for this specific video
      const videoSrc = video.currentSrc || video.src;
      return this.config.settings.speeds[videoSrc] || 1.0;
    }
  }

  /**
   * Apply speed change and update all state
   * @param {HTMLMediaElement} video - Video element
   * @param {number} speed - Target speed
   * @param {string} source - Change source ('internal' or 'external')
   * @private
   */
  _commitSpeedChange_upstream(video, speed, source) {
    logger.debug(`Committing speed change: ${speed} (source: ${source})`);

    // 1. Set the actual playback rate
    video.playbackRate = speed;

    // 2. Dispatch synthetic event with origin marker
    video.dispatchEvent(
      new CustomEvent('ratechange', {
        bubbles: true,
        composed: true,
        detail: {
          origin: 'videoSpeed',
          speed: formatSpeed(speed),
          source: source,
        },
      })
    );

    // 3. Update UI
    const speedIndicator = video.vsc?.speedIndicator;
    if (speedIndicator) {
      speedIndicator.textContent = formatSpeed(speed);
    }

    // 4. Update settings based on rememberSpeed
    if (this.config.settings.rememberSpeed) {
      // Global mode - update lastSpeed
      this.config.settings.lastSpeed = speed;
    } else {
      // Per-video mode - store in memory only (not persisted)
      const videoSrc = video.currentSrc || video.src;
      if (videoSrc) {
        this.config.settings.speeds[videoSrc] = speed;
      }
    }

    // Always update lastSpeed for UI consistency
    this.config.settings.lastSpeed = speed;

    // 5. Save to storage
    this.config.save({
      lastSpeed: this.config.settings.lastSpeed,
    });

    // 6. Show controller briefly if hidden
    if (video.vsc?.div) {
      this.blinkController(video.vsc.div);
    }

    // 7. Refresh cooldown to prevent rapid changes
    if (this.eventManager) {
      this.eventManager.refreshCoolDown();
    }
  }
}

// Create singleton instance
window.VSC.ActionHandler = ActionHandler;

// Global variables available for both browser and testing
