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

      if (!video.currentSrc || !video.src) {
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
      this.setSpeed(video, speedValue);
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

      case 'faster': {
        logger.debug('Increase speed');
        const fasterSpeed = Math.min(
          (video.playbackRate < 0.1 ? 0.0 : video.playbackRate) + value,
          SPEED_LIMITS.MAX
        );
        this.setSpeed(video, fasterSpeed);
        return true;
      }

      case 'slower': {
        logger.debug('Decrease speed');
        const slowerSpeed = Math.max(video.playbackRate - value, SPEED_LIMITS.MIN);
        this.setSpeed(video, slowerSpeed);
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

      case 'SET_SPEED': {
        const speed = value;
        if (typeof speed === 'number' && speed > 0 && speed <= SPEED_LIMITS.MAX) {
          logger.log('Setting speed to:', speed);
          this.setSpeed(video, speed);
        } else {
          logger.warn('Invalid speed value:', speed);
        }
        return true;
      }

      case 'ADJUST_SPEED': {
        const delta = value;
        if (typeof delta === 'number') {
          logger.log('Adjusting speed by:', delta);
          this.adjustSpeed(delta);
        } else {
          logger.warn('Invalid delta value:', delta);
        }
        return true;
      }

      case 'RESET_SPEED': {
        logger.log('Resetting speed');
        const preferredSpeed = this.config.getSpeedStep('fast');
        this.setSpeed(video, preferredSpeed);
        return true;
      }

      default:
        logger.warn(`Unknown action: ${actionName}`);
        return false;
    }
  }

  /**
   * Set video playback speed
   * @param {HTMLMediaElement & { vsc?: VideoController }} video - Video element
   * @param {number} speed - Speed to set
   */
  setSpeed(video, speed) {
    logger.debug(`setSpeed started: ${speed}`);

    const src = video?.currentSrc || video?.src;
    if (!src) {
      return;
    }

    const url = getBaseURL(src);
    if (speed === undefined) {
      if (this.config.settings.forceLastSavedSpeed) {
        speed = this.config.settings.sources[url]?.speed;
      }
    }

    // MyNote | For some reason, this ends up being undefined sometimes 🤷
    if (speed === undefined) {
      return;
    }

    const speedValue = speed.toFixed(1);
    const numericSpeed = Number(speedValue);

    video.playbackRate = numericSpeed;

    // MyNote | Doing this creates an infinite loop, so I ignore cooldown
    //              in event-manager and not do this here either!
    // if (this.config.settings.forceLastSavedSpeed) {
    //   video.dispatchEvent(
    //     new CustomEvent('ratechange', {
    //       bubbles: true,
    //       composed: true,
    //       detail: { origin: 'videoSpeed', speed: speedValue },
    //     })
    //   );
    // } else {
    //   video.playbackRate = numericSpeed;
    // }

    video.vsc?.setSpeedVal(numericSpeed);

    // MyNote | Don't think I need this; I'm handing things differently.
    // Store per-video speed if rememberSpeed is enabled
    // if (this.config.settings.rememberSpeed) {
    //   const videoSrc = video.currentSrc || video.src;
    //
    //   if (videoSrc) {
    //     this.config.settings.speeds[videoSrc] = numericSpeed;
    //     logger.debug(`Stored speed ${numericSpeed} for video: ${videoSrc}`);
    //   }
    // }

    this.config.syncSpeedValue({
      speed: numericSpeed,
      url,
    });

    this.eventManager.refreshCoolDown();

    logger.debug(`setSpeed finished: ${speed}`);
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
          this.setSpeed(video, 1.0);
        } else {
          logger.info('Toggling playback speed to "fast" speed');
          this.setSpeed(video, this.config.getKeyBinding('fast'));
        }
      } else {
        logger.info('Toggling playback speed to "reset" speed');
        this.setSpeed(video, this.config.getKeyBinding('reset'));
      }
    } else {
      logger.info('Toggling playback speed to "reset" speed');
      this.config.setKeyBinding('reset', video.playbackRate);
      this.setSpeed(video, target);
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
   * Adjust speed
   * @param {number} delta - Amount to adjust
   */
  adjustSpeed(delta) {
    const video = this.config.getMediaElements()[0];
    if (video) {
      const currentSpeed = video.playbackRate;
      const newSpeed = Math.min(Math.max(currentSpeed + delta, SPEED_LIMITS.MIN), SPEED_LIMITS.MAX);
      this.setSpeed(video, newSpeed);
    }
  }
}

// Create singleton instance
window.VSC.ActionHandler = ActionHandler;

// Global variables available for both browser and testing
