/**
 * Action handling system for Video Speed Controller
 *
 * @typedef {import('./video-controller.js').VideoController} VideoController
 * @typedef {import('./config.js').VideoSpeedConfig} VideoSpeedConfig
 * @typedef {import('../utils/event-manager.js').EventManager} EventManager
 */

window.VSC = window.VSC || {};

import { logger } from '../utils/logger.js';
import { getBaseURL } from '../utils/url.js';
import { SPEED_LIMITS } from '../shared/constants.js';
import { DragHandler } from '../ui/drag-handler.js';
import { stateManager } from '../core/state-manager.js';

export class ActionHandler {
  /**
   * @param {VideoSpeedConfig} config - Config handler
   * @param {EventManager} eventManager - Event manager
   */
  constructor({ config, eventManager, siteHandlerManager }) {
    this.config = config;
    this.eventManager = eventManager;
    this.siteHandlerManager = siteHandlerManager;
  }

  /**
   * Execute an action on media elements
   * @param {string} action - Action to perform
   * @param {*} value - Action value
   * @param {Event} event - Event object (optional)
   */
  runAction({ actionItem, event, wrapperDiv = null, isKeyUp = false }) {
    logger.debug('runAction Begin:', actionItem);

    const mediaTags = stateManager.getControlledElements();

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

    if (actionName === 'drag') {
      const draggable = event.target.closest('.draggable');
      return this.executeAction({ actionName, value, value2, video: draggable, event, wrapperDiv });
    }

    // Get the controller that was used if called from a button press event
    let targetController = null;
    if (event) {
      targetController = event.target.getRootNode().host;
    }

    // Return true (meaning: "we handled it") if the action applied to at least one of our media elements
    const result = mediaTags.some((video) => {
      const wrapperDiv = video.vsc?.wrapperDiv;

      if (!wrapperDiv) {
        return false; // We didn't handle it
      }

      // Don't change video speed if the video has a different controller
      // Only apply this check for button clicks (when targetController is set)
      if (event && targetController && targetController !== wrapperDiv) {
        return false; // We didn't handle it
      }

      if (!video.currentSrc && !video.src) {
        logger.debug('runAction not handling because src is empty', video);
        return false; // We didn't handle it
      }

      this.eventManager.showController(wrapperDiv);

      if (!video.classList.contains('vsc-cancelled')) {
        // MyNote: for keyup events, I assume that if we reach here, it means that we had an action
        //         that was handled by keydown, so returning true to indicate that it's a "VSC key".
        return isKeyUp ? true : this.executeAction({ actionName, value, value2, video, event });
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
  executeAction({ actionName, value, value2, video, event, wrapperDiv }) {
    const percent = (value * video.duration) / 100;
    const step = Math.min(value2 || 5, percent); // Only used for rewind and advance
    const source = 'action-handler';

    if (actionName.startsWith('fixspeed')) {
      const speedStr = actionName.split('_')[1];
      const speedValue = Number(`${speedStr[0]}.${speedStr[1]}`);
      this.adjustSpeed(video, speedValue, { source });
      return true;
    }

    switch (actionName) {
      case 'rewind':
        logger.debug('Rewind');
        this.seek(video, -step);
        return true;

      case 'advance':
        logger.debug('Fast forward');
        this.seek(video, step);
        return true;

      case 'faster':
        logger.debug('Increase speed');
        this.adjustSpeed(video, value, { relative: true, source });
        return true;

      case 'slower': {
        logger.debug('Decrease speed');
        this.adjustSpeed(video, -value, { relative: true, source });
        return true;
      }

      case 'reset':
        logger.debug('Reset speed');
        this.resetSpeed(video, value);
        return true;

      case 'display': {
        logger.debug('Display action triggered');
        const wrapperDiv = video.vsc.wrapperDiv;

        // MyNote: this is checked in runAction, so do we need it here?!
        // if (!controller) {
        //   logger.error('No controller found for video');
        //   return;
        // }

        wrapperDiv.classList.add('vsc-manual');
        wrapperDiv.classList.toggle('vsc-hidden');

        // Clear any pending timers that might interfere with manual toggle
        // This prevents delays when manually hiding/showing the controller
        if (wrapperDiv.blinkTimeOut !== undefined) {
          clearTimeout(wrapperDiv.blinkTimeOut);
          wrapperDiv.blinkTimeOut = undefined;
        }

        // Also clear EventManager timer if it exists
        if (this.eventManager && this.eventManager.timer) {
          clearTimeout(this.eventManager.timer);
          this.eventManager.timer = null;
        }

        // Remove vsc-show class immediately when manually hiding
        if (wrapperDiv.classList.contains('vsc-hidden')) {
          wrapperDiv.classList.remove('vsc-show');
          logger.debug('Removed vsc-show class for immediate manual hide');
        }

        return true;
      }

      case 'blink':
        logger.debug('Showing controller momentarily');
        this.blinkController(video.vsc.controllerDiv, value);
        return true;

      case 'drag':
        DragHandler.handleDrag({ video, event, wrapperDiv });
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

      case 'pip_toggle':
        return this.togglePip(video);

      case 'SET_SPEED':
        logger.info('Setting speed to:', value);
        this.adjustSpeed(video, value, { source: 'internal' });
        return true;

      case 'ADJUST_SPEED':
        logger.info('Adjusting speed by:', value);
        this.adjustSpeed(video, value, { relative: true, source: 'internal' });
        return true;

      case 'RESET_SPEED': {
        logger.info('Resetting speed');
        const preferredSpeed = this.config.getSpeedStep('fast');
        this.adjustSpeed(video, preferredSpeed, { source: 'internal' });
        return true;
      }

      default:
        logger.warn(`Unknown action: ${actionName}`);
        return false;
    }
  }

  /**
   * Adjust video playback speed (absolute or relative)
   * Simplified to use proven working logic from setSpeed method
   *
   * @param {HTMLMediaElement} video - Target video element
   * @param {number} value - Speed value (absolute) or delta (relative)
   * @param {Object} options - Configuration options
   * @param {boolean} options.relative - If true, value is a delta; if false, absolute speed
   * @param {string} options.source - 'internal' (user action) or 'external' (site/other)
   */
  adjustSpeed(video, value, options = {}) {
    logger.withContext(video, () => {
      logger.debug('[adjustSpeed] started', value, video);

      const { relative = false, source = 'internal' } = options;

      const src = video?.currentSrc || video?.src;
      if (!src) {
        logger.warn('adjustSpeed called on video without source', video);
        return;
      }

      const url = getBaseURL(src);
      logger.debug('[adjustSpeed]', 'url', url);

      let targetSpeed;
      if (value === undefined) {
        targetSpeed = this.config.settings.sources[url]?.speed || 1;
        logger.debug('[adjustSpeed]', 'undefined value for speed');
      } else {
        if (relative) {
          const currentSpeed = video.playbackRate < 0.1 ? 0.0 : video.playbackRate;
          targetSpeed = currentSpeed + value;
          logger.debug('[adjustSpeed]', 'relative value');
        } else {
          logger.debug('[adjustSpeed]', 'non-relative value');
          targetSpeed = value;
        }
      }

      targetSpeed = Math.min(Math.max(targetSpeed, SPEED_LIMITS.MIN), SPEED_LIMITS.MAX);
      const numericSpeed = Number(targetSpeed.toFixed(1));
      logger.debug('[adjustSpeed]', 'numericSpeed', numericSpeed);

      video.playbackRate = numericSpeed;

      video.vsc?.setSpeedVal(numericSpeed);

      // Only update speed when we manually change it using an action
      if (source === 'action-handler') {
        logger.debug('[adjustSeped]', 'source is action-handler; saving', numericSpeed, 'for url', url);

        this.config.syncSpeedValue({
          speed: numericSpeed,
          url,
        });
      }

      logger.debug(`adjustSpeed finished: ${value}`);
    });
  }

  /**
   * Seek video by specified seconds
   * @param {HTMLMediaElement} video - Video element
   * @param {number} seekSeconds - Seconds to seek
   */
  seek(video, seekSeconds) {
    // Use site-specific seeking (handlers return true if they handle it)
    this.siteHandlerManager.handleSeek(video, seekSeconds);
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
    if (!video.vsc) {
      logger.warn('resetSpeed called on video without controller');
      return;
    }

    const currentSpeed = video.playbackRate;

    if (currentSpeed === target) {
      // At target speed - restore remembered speed if we have one, otherwise reset to target
      if (video.vsc.speedBeforeReset !== null) {
        logger.info(`Restoring remembered speed: ${video.vsc.speedBeforeReset}`);
        const rememberedSpeed = video.vsc.speedBeforeReset;
        video.vsc.speedBeforeReset = null; // Clear memory after use
        this.adjustSpeed(video, rememberedSpeed);
      } else {
        logger.info(`Already at reset speed ${target}, no change`);
        // Already at target and nothing remembered - no action needed
      }
    } else {
      // Not at target speed - remember current and reset to target
      logger.info(`Remembering speed ${currentSpeed} and resetting to ${target}`);
      video.vsc.speedBeforeReset = currentSpeed;
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
   * Toggle PiP mode
   * @param {HTMLMediaElement} video - Video element
   */
  togglePip(video) {
    if (video.tagName !== 'VIDEO') return false;

    if (document.pictureInPictureElement) {
      document.exitPictureInPicture();
    } else {
      video.requestPictureInPicture();
    }

    return true;
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

    // Always clear any existing timeout first
    if (controller.blinkTimeOut !== undefined) {
      clearTimeout(controller.blinkTimeOut);
      controller.blinkTimeOut = undefined;
    }

    // Add vsc-show class to temporarily show controller
    // This overrides vsc-hidden via CSS specificity
    controller.classList.add('vsc-show');
    logger.debug('Showing controller temporarily with vsc-show class');

    // For audio controllers, don't set timeout to hide again
    if (!isAudioController) {
      controller.blinkTimeOut = setTimeout(
        () => {
          controller.classList.remove('vsc-show');
          controller.blinkTimeOut = undefined;
          logger.debug('Removing vsc-show class after timeout');
        },
        duration ? duration : 2500
      );
    } else {
      logger.debug('Audio controller blink - keeping vsc-show class');
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
    const mediaElements = stateManager.getControlledElements();

    for (const media of mediaElements) {
      if (media.vsc && media.vsc.div === controller) {
        return media.tagName === 'AUDIO';
      }
    }
    return false;
  }

  /**
   * Adjust video playback speed (absolute or relative)
   * Simplified to use proven working logic from setSpeed method
   *
   * @param {HTMLMediaElement} video - Target video element
   * @param {number} value - Speed value (absolute) or delta (relative)
   * @param {Object} options - Configuration options
   * @param {boolean} options.relative - If true, value is a delta; if false, absolute speed
   * @param {string} options.source - 'internal' (user action) or 'external' (site/other)
   */
  adjustSpeed_upstream(video, value, options = {}) {
    return window.VSC.logger.withContext(video, () => {
      const { relative = false, source = 'internal' } = options;

      // DEBUG: Log all adjustSpeed calls to trace the mystery
      window.VSC.logger.debug(`adjustSpeed called: value=${value}, relative=${relative}, source=${source}`);
      const stack = new Error().stack;
      const stackLines = stack.split('\n').slice(1, 8); // First 7 stack frames
      window.VSC.logger.debug(`adjustSpeed call stack: ${stackLines.join(' -> ')}`);

      // Validate input
      if (!video || !video.vsc) {
        window.VSC.logger.warn('adjustSpeed called on video without controller');
        return;
      }

      if (typeof value !== 'number' || isNaN(value)) {
        window.VSC.logger.warn('adjustSpeed called with invalid value:', value);
        return;
      }

      return this._adjustSpeedInternal(video, value, options);
    });
  }

  /**
   * Internal adjustSpeed implementation (context already set)
   * @private
   */
  _adjustSpeedInternal(video, value, options) {
    const { relative = false, source = 'internal' } = options;

    // Show controller for visual feedback when speed is changed
    if (video.vsc?.div && this.eventManager) {
      this.eventManager.showController(video.vsc.div);
    }

    // Calculate target speed
    let targetSpeed;
    if (relative) {
      // For relative changes, add to current speed
      const currentSpeed = video.playbackRate < 0.1 ? 0.0 : video.playbackRate;
      targetSpeed = currentSpeed + value;
      logger.debug(`Relative speed calculation: currentSpeed=${currentSpeed} + ${value} = ${targetSpeed}`);
    } else {
      // For absolute changes, use value directly
      targetSpeed = value;
      logger.debug(`Absolute speed set: ${targetSpeed}`);
    }

    // Clamp to valid range
    targetSpeed = Math.min(Math.max(targetSpeed, SPEED_LIMITS.MIN), SPEED_LIMITS.MAX);

    // Round to 2 decimal places to avoid floating point issues
    targetSpeed = Number(targetSpeed.toFixed(2));

    // Handle force mode for external changes - restore user preference
    if (source === 'external' && this.config.settings.forceLastSavedSpeed) {
      // In force mode, use lastSpeed instead of allowing external change
      targetSpeed = this.config.settings.lastSpeed || 1.0;
      logger.debug(`Force mode: blocking external change, restoring to ${targetSpeed}`);
    }

    // Use the proven setSpeed implementation with source tracking
    this.setSpeed(video, targetSpeed, source);
  }

  /**
   * Get user's preferred speed (always global lastSpeed)
   * Public method for tests - matches VideoController.getTargetSpeed() logic
   * @param {HTMLMediaElement} video - Video element (for API compatibility)
   * @returns {number} Current preferred speed (always lastSpeed regardless of rememberSpeed setting)
   */
  getPreferredSpeed() {
    return this.config.settings.lastSpeed || 1.0;
  }

  /**
   * Set video playback speed with complete state management
   * Unified implementation with all functionality - no fragmented logic
   * @param {HTMLMediaElement} video - Video element
   * @param {number} speed - Target speed
   * @param {string} source - Change source: 'internal' (user/extension) or 'external' (site)
   */
  setSpeed(video, speed, source = 'internal') {
    const speedValue = speed.toFixed(2);
    const numericSpeed = Number(speedValue);

    // 1. Set the actual playback rate
    video.playbackRate = numericSpeed;

    // 2. Always dispatch synthetic event with source tracking
    // This allows EventManager to distinguish our changes from external ones
    video.dispatchEvent(
      new CustomEvent('ratechange', {
        bubbles: true,
        composed: true,
        detail: {
          origin: 'videoSpeed',
          speed: speedValue,
          source: source,
        },
      })
    );

    // 3. Update UI indicator
    const speedIndicator = video.vsc?.speedIndicator;
    if (!speedIndicator) {
      logger.warn('Cannot update speed indicator: video controller UI not fully initialized');
      return;
    }
    speedIndicator.textContent = numericSpeed.toFixed(2);

    // 4. Always update page-scoped speed preference
    logger.debug(`Updating config.settings.lastSpeed from ${this.config.settings.lastSpeed} to ${numericSpeed}`);
    this.config.settings.lastSpeed = numericSpeed;

    // 5. Save to storage ONLY if rememberSpeed is enabled for cross-session persistence
    if (this.config.settings.rememberSpeed) {
      logger.debug(`Saving lastSpeed ${numericSpeed} to Chrome storage`);
      this.config.save({
        lastSpeed: this.config.settings.lastSpeed,
      });
    } else {
      logger.debug('NOT saving to storage - rememberSpeed is false');
    }

    // 6. Show controller briefly for visual feedback
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
