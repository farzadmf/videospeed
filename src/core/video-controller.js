/**
 * Video Controller class for managing individual video elements
 * Modular architecture using global variables
 */

window.VSC = window.VSC || {};

import { getBaseURL } from '../utils/url.js';
import { logger } from '../utils/logger.js';
import { ControlsManager } from '../ui/controls-manager.js';
import { ShadowDOMManager } from '../ui/shadow-dom-manager.js';
import { siteHandlerManager } from '../site-handlers/manager.js';
import { formatSpeed, formatVolume } from '../shared/constants.js';

export class VideoController {
  /**
   * @param {HTMLMediaElement & { vsc?: VideoController }} target - Video element
   * @param {VideoSpeedConfig} config - Config
   */
  constructor(target, parent, config, actionHandler, shouldStartHidden = false) {
    // Return existing controller if already attached
    if (target.vsc) {
      return target.vsc;
    }

    this.video = target;
    this.parent = target.parentElement || parent;
    this.config = config;
    this.actionHandler = actionHandler;
    this.controlsManager = new ControlsManager(actionHandler, config);
    this.shadowManager = new ShadowDOMManager(target);
    this.shouldStartHidden = shouldStartHidden;

    this.targetObserver = null;
    this.intersectionObserver = null;
    this.scrollListener = null;
    this.resizeListener = null;

    this.isVisible = true;

    // Throttled scroll listener for smooth updates
    this.scrollTicking = false;
    this.resizeTicking = false;

    this.scrollListener = () => {
      if (!this.scrollTicking) {
        requestAnimationFrame(() => {
          logger.debug('[scrollListener] Video is visible; adjusting location');
          this.shadowManager.adjustLocation();
          this.scrollTicking = false;
        });
        this.scrollTicking = true;
      }
    };
    this.resizeListener = () => {
      if (!this.resizeTicking) {
        requestAnimationFrame(() => {
          logger.debug('[resizeListener] Video is visible; adjusting location');
          this.shadowManager.adjustLocation();
          this.resizeTicking = false;
        });
        this.resizeTicking = true;
      }
    };

    siteHandlerManager.setup({
      onShow: () => this.shadowManager.showController(),
      onHide: () => this.shadowManager.hideController(),
      video: target,
    });

    this.speed = 0;
    this.volume = 0;

    // Generate unique controller ID for badge tracking
    this.controllerId = this.generateControllerId(target);

    // Add to tracked media elements
    config.addMediaElement(target);

    // Attach controller to video element first (needed for adjustSpeed)
    target.vsc = this;

    // Initialize speed
    this.initializeSpeed();

    // Create wrapper element (used by initializeControls)
    this.wrapperDiv = document.createElement('div');

    // Create UI
    this.initializeControls();

    this.controllerDiv = this.shadowManager.controllerDiv;
    this.progressDiv = this.shadowManager.progressDiv;

    // Set up event handlers
    this.setupEventHandlers();

    // Set up mutation observer for src changes
    this.setupMutationObserver();
    this.setupIntersectionObserver();
    // this.startScrollListener();
    // this.startResizeListener();

    logger.info('VideoController initialized for video element');

    // Dispatch controller created event for badge management
    this.dispatchControllerEvent('VSC_CONTROLLER_CREATED', {
      controllerId: this.controllerId,
      videoSrc: this.video.currentSrc || this.video.src,
      tagName: this.video.tagName,
    });
  }

  /**
   * Initialize video speed based on settings
   * @private
   */
  initializeSpeed() {
    const targetSpeed = this.getTargetSpeed();

    this.speed = targetSpeed;

    // Just making sure?!
    this.video.playbackRate = targetSpeed;

    // Use adjustSpeed for initial speed setting to ensure consistency
    if (this.actionHandler && targetSpeed !== this.video.playbackRate) {
      window.VSC.logger.debug('Setting initial speed via adjustSpeed');
      this.actionHandler.adjustSpeed(this.video, targetSpeed, { source: 'internal' });
    }
  }

  /**
   * Get target speed based on rememberSpeed setting and update reset binding
   * @param {HTMLMediaElement} media - Optional media element (defaults to this.video)
   * @returns {number} Target speed
   * @private
   */
  getTargetSpeed(media = this.video) {
    let targetSpeed;

    const videoSrc = getBaseURL(media.currentSrc || media.src);
    logger.debug('[getTargetSpeed]', 'videoSrc', videoSrc);
    const storedSpeed = this.config.settings.sources[videoSrc]?.speed;
    logger.debug('[getTargetSpeed]', 'storedSpeed', storedSpeed);

    if (this.config.settings.rememberSpeed) {
      if (storedSpeed) {
        logger.debug('[getTargetSpeed] Using stored speed for video', storedSpeed);
        targetSpeed = storedSpeed;
      } else if (this.config.settings.lastSpeed) {
        // Global behavior - use lastSpeed for all videos
        // targetSpeed = this.config.settings.lastSpeed || 1.0;
        targetSpeed = 1.0;
        logger.debug('[getTargetSpeed] Global mode: using lastSpeed', targetSpeed);
      }
    } else {
      // Per-video behavior - use stored speed for this specific video
      // targetSpeed = storedSpeed || 1.0;
      targetSpeed = 1.0;
      // logger.debug(`Per-video mode: using speed ${targetSpeed} for ${videoSrc}`);
      logger.debug('[getTargetSpeed]', 'Remember speed not enabled; using default 1.0 speed');
    }

    return targetSpeed;
  }

  /**
   * Initialize video controller UI
   * @returns {HTMLElement} Controller wrapper element
   * @private
   */
  initializeControls() {
    logger.debug('initializeControls Begin');

    const document = this.video.ownerDocument;
    const speed = formatSpeed(this.video.playbackRate);
    const volume = this.video.volume;

    logger.debug(`Speed variable set to: ${speed}`);

    this.wrapperDiv.style.setProperty('--opacity', this.config.settings.controllerOpacity);

    // Apply all CSS classes at once to prevent race condition flash
    const cssClasses = ['vsc-main'];

    // Only hide controller if video has no source AND is not ready/functional
    // This prevents hiding controllers for live streams or dynamically loaded videos
    if (!this.video.currentSrc && !this.video.src && this.video.readyState < 2) {
      cssClasses.push('vsc-nosource');
    }

    if (this.config.settings.startHidden || this.shouldStartHidden) {
      // MyNote: using CSS variables instead.
      // cssClasses.push('vsc-hidden');

      this.wrapperDiv.style.setProperty('--visibility', 'hidden');

      if (this.shouldStartHidden) {
        logger.debug('Starting controller hidden due to video visibility/size');
      } else {
        logger.info(
          `Controller starting hidden due to startHidden setting: ${this.config.settings.startHidden}`
        );
      }
    }
    // When startHidden=false, use natural visibility (no special class needed)

    // Apply all classes at once to prevent visible flash
    this.wrapperDiv.className = cssClasses.join(' ');

    // MyNote: I don't think these apply to me?
    // // Set positioning styles with calculated position
    // // Use inline styles without !important so CSS rules can override
    // let styleText = `
    //   position: absolute !important;
    //   z-index: 9999999 !important;
    //   top: ${position.top};
    //   left: ${position.left};
    // `;
    //
    // // Add inline fallback styles if controller should start hidden
    // // This prevents FOUC if inject.css hasn't loaded yet
    // if (this.config.settings.startHidden || this.shouldStartHidden) {
    //   styleText += `
    //     display: none !important;
    //     visibility: hidden !important;
    //     opacity: 0 !important;
    //   `;
    //   logger.debug('Applied inline fallback styles for hidden controller');
    // }
    //
    // wrapper.style.cssText = styleText;

    // Create shadow DOM
    this.shadowManager.createShadowDOM(this.wrapperDiv, {
      buttonSize: this.config.settings.controllerButtonSize,
      speed,
      volume,
    });

    // Set up control events
    this.controlsManager.setupControlEvents({
      shadow: this.shadowManager.shadow,
      video: this.video,
      wrapperDiv: this.wrapperDiv,
    });

    // Insert into DOM based on site-specific rules
    this.insertIntoDOM(document, this.wrapperDiv);

    // Thought about doing this directly in `createShadowDOM`, but I think doing
    // getBoundingClientRect etc needs the element(s) to already be inserted in DOM.
    this.shadowManager.adjustLocation();

    // Debug: Log final classes on controller
    logger.info(`Controller classes after creation: ${this.wrapperDiv.className}`);

    logger.debug('initializeControls End');
  }

  /**
   * Insert controller into DOM with site-specific positioning
   * @param {Document} document - Document object
   * @param {HTMLElement} wrapper - Wrapper element to insert
   * @private
   */
  insertIntoDOM(document, wrapper) {
    const fragment = document.createDocumentFragment();
    fragment.appendChild(wrapper);

    // Get site-specific positioning information
    const { insertionPoint, insertionMethod } = siteHandlerManager.getControllerPosition(
      this.parent,
      this.video
    );

    // if (insertionPoint.classList?.contains('html5-video-player')) {
    //   wrapper.style.setProperty('--margin-top', '-50px');
    // }
    // if (insertionPoint.classList?.contains('ytp-small-mode')) {
    //   wrapper.style.setProperty('--margin-left', '-250px');
    // }

    document.body.appendChild(fragment);

    // switch (insertionMethod) {
    //   case 'beforeParent':
    //     insertionPoint.parentElement.insertBefore(fragment, insertionPoint);
    //     break;
    //
    //   case 'afterParent':
    //     insertionPoint.parentElement.insertBefore(fragment, insertionPoint.nextSibling);
    //     break;
    //
    //   case 'firstChild':
    //   default:
    //     insertionPoint.insertBefore(fragment, insertionPoint.firstChild);
    //     break;
    // }

    logger.debug(`Controller inserted using ${insertionMethod} method`, wrapper);
  }

  /**
   * Set up event handlers for media events
   * @private
   */
  setupEventHandlers() {
    const mediaEventAction = (event) => {
      const targetSpeed = this.getTargetSpeed(event.target);

      logger.info(`Media event ${event.type}: restoring speed to ${targetSpeed}`);
      this.actionHandler.adjustSpeed(event.target, targetSpeed, { source: 'internal' });
    };

    this.handlePlay = mediaEventAction.bind(this);
    this.handleSeek = mediaEventAction.bind(this);
    this.handleLoadStart = mediaEventAction.bind(this);
    this.handleCanPlay = mediaEventAction.bind(this);

    this.video.addEventListener('play', this.handlePlay);
    this.video.addEventListener('seeked', this.handleSeek);
    this.video.addEventListener('loadstart', this.handleLoadStart);
    this.video.addEventListener('canplay', this.handleCanPlay);

    /**
     * Handle timeupdate to display a progress bar.
     * @param {Event} event - Time update event
     */
    const timeUpdateAction = () => {
      const progress = this.video.currentTime / this.video.duration;

      this.setProgressVal(progress);
    };

    /**
     * Handle timeupdate to display a progress bar.
     * @param {Event} event - Time update event
     */
    const volumeChangeAction = () => {
      const volume = this.video.volume;

      this.setVolumeVal(volume);
    };

    this.handleTimeUpdate = timeUpdateAction.bind(this);
    this.handleVolumeChange = volumeChangeAction.bind(this);

    this.video.addEventListener('timeupdate', this.handleTimeUpdate);
    this.video.addEventListener('volumechange', this.handleVolumeChange);

    logger.debug('Added comprehensive media event handlers: play, seeked, loadstart, canplay');
  }

  /**
   * Set up mutation observer for src attribute changes
   * @private
   */
  setupMutationObserver() {
    this.targetObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (
          mutation.type === 'attributes' &&
          (mutation.attributeName === 'src' || mutation.attributeName === 'currentSrc')
        ) {
          logger.debug('mutation of A/V element');
          const wrapper = this.wrapperDiv;
          if (!mutation.target.src && !mutation.target.currentSrc) {
            wrapper.classList.add('vsc-nosource');
          } else {
            wrapper.classList.remove('vsc-nosource');

            this.actionHandler.adjustSpeed(this.video);
            this.shadowManager.adjustLocation();
          }
        }
      });
    });

    this.targetObserver.observe(this.video, {
      attributeFilter: ['src', 'currentSrc'],
    });
  }

  setupIntersectionObserver() {
    this.intersectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            logger.debug(
              '[setupIntersectionObserver] Video is visible; showing and adjusting location'
            );
            this.isVisible = true;
            this.shadowManager.show();
            this.shadowManager.adjustLocation();
            this.startScrollListener();
            this.startResizeListener();
          } else {
            logger.debug('[setupIntersectionObserver] Video is not visible; hiding controller');
            this.isVisible = false;
            this.shadowManager.hide();
            this.stopScrollListener();
            this.stopResizeListener();
          }
        });
      },
      { threshold: 0.1 }
    );

    this.intersectionObserver.observe(this.video);
  }

  startScrollListener() {
    window.addEventListener('scroll', this.scrollListener);
  }
  stopScrollListener() {
    window.removeEventListener('scroll', this.scrollListener);
  }

  startResizeListener() {
    window.addEventListener('resize', this.resizeListener);
  }
  stopResizeListener() {
    window.removeEventListener('resize', this.resizeListener);
  }

  /**
   * Remove controller and clean up
   */
  remove() {
    logger.debug('Removing VideoController');

    // Remove DOM element
    if (this.controllerDiv && this.controllerDiv.parentNode) {
      this.controllerDiv.remove();
    }

    // Remove event listeners
    if (this.handlePlay) {
      this.video.removeEventListener('play', this.handlePlay);
    }
    if (this.handleSeek) {
      this.video.removeEventListener('seeked', this.handleSeek);
    }
    if (this.handleLoadStart) {
      this.video.removeEventListener('loadstart', this.handleLoadStart);
    }
    if (this.handleCanPlay) {
      this.video.removeEventListener('canplay', this.handleCanPlay);
    }

    if (this.handleTimeUpdate) {
      this.video.removeEventListener('canplay', this.handleTimeUpdate);
    }
    if (this.handleVolumeChange) {
      this.video.removeEventListener('canplay', this.handleVolumeChange);
    }

    // Disconnect mutation observer
    if (this.targetObserver) {
      this.targetObserver.disconnect();
    }
    if (this.intersectionObserver) {
      this.intersectionObserver.disconnect();
    }
    if (this.scrollListener) {
      window.removeEventListener('scroll', this.scrollListener);
    }
    if (this.resizeListener) {
      window.removeEventListener('resize', this.resizeListener);
    }

    // Remove from tracking
    this.config.removeMediaElement(this.video);

    // Remove reference from video element
    delete this.video.vsc;

    logger.debug('VideoController removed successfully');

    // Dispatch controller removed event for badge management
    this.dispatchControllerEvent('VSC_CONTROLLER_REMOVED', {
      controllerId: this.controllerId,
      videoSrc: this.video.currentSrc || this.video.src,
      tagName: this.video.tagName,
    });
  }

  /**
   * Generate unique controller ID for badge tracking
   * @param {HTMLElement} target - Video/audio element
   * @returns {string} Unique controller ID
   * @private
   */
  generateControllerId(target) {
    const timestamp = Date.now();
    const src = target.currentSrc || target.src || 'no-src';
    const tagName = target.tagName.toLowerCase();

    // Create a simple hash from src for uniqueness
    const srcHash = src.split('').reduce((hash, char) => {
      hash = (hash << 5) - hash + char.charCodeAt(0);
      return hash & hash; // Convert to 32-bit integer
    }, 0);

    return `${tagName}-${Math.abs(srcHash)}-${timestamp}`;
  }

  /**
   * Check if the video element is currently visible
   * @returns {boolean} True if video is visible
   */
  isVideoVisible() {
    // Check if video is still connected to DOM
    if (!this.video.isConnected) {
      return false;
    }

    // Check computed style for visibility
    const style = window.getComputedStyle(this.video);
    if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
      return false;
    }

    // Check if video has reasonable dimensions
    const rect = this.video.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) {
      return false;
    }

    return true;
  }

  /**
   * Update controller visibility based on video visibility
   * Called when video visibility changes
   */
  updateVisibility() {
    const isVisible = this.isVideoVisible();
    const isCurrentlyHidden = this.controllerDiv.classList.contains('vsc-hidden');

    // Special handling for audio elements - don't hide controllers for functional audio
    if (this.video.tagName === 'AUDIO') {
      // For audio, only hide if manually hidden or if audio support is disabled
      if (!this.config.settings.audioBoolean && !isCurrentlyHidden) {
        this.controllerDiv.classList.add('vsc-hidden');
        logger.debug('Hiding audio controller - audio support disabled');
      } else if (
        this.config.settings.audioBoolean &&
        isCurrentlyHidden &&
        !this.controllerDiv.classList.contains('vsc-manual')
      ) {
        // Show audio controller if audio support is enabled and not manually hidden
        this.controllerDiv.classList.remove('vsc-hidden');
        logger.debug('Showing audio controller - audio support enabled');
      }

      return;
    }

    // Original logic for video elements
    if (
      isVisible &&
      isCurrentlyHidden &&
      !this.controllerDiv.classList.contains('vsc-manual') &&
      !this.config.settings.startHidden
    ) {
      // Video became visible and controller is hidden (but not manually hidden)
      this.controllerDiv.classList.remove('vsc-hidden');
      logger.debug('Showing controller - video became visible');
    } else if (!isVisible && !isCurrentlyHidden) {
      // Video became invisible and controller is visible
      this.controllerDiv.classList.add('vsc-hidden');
      logger.debug('Hiding controller - video became invisible');
    }
  }

  /**
   * Dispatch controller lifecycle events for badge management
   * @param {string} eventType - Event type (VSC_CONTROLLER_CREATED or VSC_CONTROLLER_REMOVED)
   * @param {Object} detail - Event detail data
   * @private
   */
  dispatchControllerEvent(eventType, detail) {
    try {
      const event = new CustomEvent(eventType, { detail });
      window.dispatchEvent(event);
      logger.debug(`Dispatched ${eventType} event for controller ${detail.controllerId}`);
    } catch (error) {
      logger.error(`Failed to dispatch ${eventType} event:`, error);
    }
  }

  /**
   * Set speed indicator's text
   * @param {number|string} value - Speed value
   */
  setSpeedVal(value) {
    logger.debug(`setSpeedVal: ${value}`);
    this.shadowManager.speedIndicator.textContent = `${formatSpeed(value)}x`;
  }

  /**
   * Set volume indicator's text
   * @param {number|string} value - Volume value
   */
  setVolumeVal(value) {
    logger.debug(`setVolumeVal: ${value}`);
    this.shadowManager.volumeIndicator.textContent = `(vol: ${formatVolume(value)})`;
  }

  /**
   * Set progress indicator's text
   * @param {number|string} value - Progress value
   */
  setProgressVal(value) {
    logger.verbose(`setProgressVal: ${value}`);
    const percent = ((Number(value) || 0) * 100).toFixed(1);

    this.shadowManager.progressDiv.style.display = 'flex';
    this.shadowManager.progressText.textContent = `${percent}%`;
    this.shadowManager.progressLine.style.width = `${percent}%`;
  }
}

// Create singleton instance
window.VSC.VideoController = VideoController;

// Global variables available for both browser and testing
