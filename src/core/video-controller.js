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

    // Create UI
    this.div = this.initializeControls();

    // Set up event handlers
    this.setupEventHandlers();

    // Set up mutation observer for src changes
    this.setupMutationObserver();

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
    logger.debug(`Setting initial playbackRate to: ${targetSpeed}`);

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

    if (this.config.settings.rememberSpeed) {
      // Global behavior - use lastSpeed for all videos
      targetSpeed = this.config.settings.lastSpeed || 1.0;
      logger.debug(`Global mode: using lastSpeed ${targetSpeed}`);
    } else {
      // Per-video behavior - use stored speed for this specific video
      const videoSrc = media.currentSrc || media.src;
      const storedSpeed = this.config.settings.sources[getBaseURL(videoSrc)]?.speed;
      targetSpeed = storedSpeed || 1.0;
      logger.debug(`Per-video mode: using speed ${targetSpeed} for ${videoSrc}`);
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
    const position = this.shadowManager.calculatePosition(this.video);

    logger.debug(`Speed variable set to: ${speed}`);

    // Create wrapper elements
    const wrapper = document.createElement('div');
    const progressWrapper = document.createElement('div');
    progressWrapper.setAttribute('id', 'vsc-progress');

    const wrappers = [wrapper, progressWrapper];

    // Apply all CSS classes at once to prevent race condition flash
    const cssClasses = ['vsc-controller'];

    // Only hide controller if video has no source AND is not ready/functional
    // This prevents hiding controllers for live streams or dynamically loaded videos
    if (!this.video.currentSrc && !this.video.src && this.video.readyState < 2) {
      cssClasses.push('vsc-nosource');
    }

    if (this.config.settings.startHidden || this.shouldStartHidden) {
      cssClasses.push('vsc-hidden');

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
    wrapper.className = cssClasses.join(' ');

    // Set positioning styles with calculated position
    // Use inline styles without !important so CSS rules can override
    let styleText = `
      position: absolute !important;
      z-index: 9999999 !important;
      top: ${position.top};
      left: ${position.left};
    `;
    // MyNote: update according to the comment!!! Are top/left necessary?
    styleText = `
      position: absolute;
      z-index: 9999999;
    `;

    // Add inline fallback styles if controller should start hidden
    // This prevents FOUC if inject.css hasn't loaded yet
    if (this.config.settings.startHidden || this.shouldStartHidden) {
      styleText += `
        display: none !important;
        visibility: hidden !important;
        opacity: 0 !important;
      `;
      logger.debug('Applied inline fallback styles for hidden controller');
    }

    // wrappers.forEach((wrapper) => (wrapper.style.cssText = styleText));

    // Create shadow DOM
    this.shadowManager.createShadowDOM(wrapper, progressWrapper, {
      buttonSize: this.config.settings.controllerButtonSize,
      opacity: this.config.settings.controllerOpacity,
      speed,
      volume,
    });

    // Set up control events
    this.controlsManager.setupControlEvents(this.shadowManager.shadow, this.video);
    // this.controlsManager.setupDragHandler(this.shadowManager.progressShadow);

    // Insert into DOM based on site-specific rules
    this.insertIntoDOM(document, wrappers);

    // this.shadowManager.adjustLocation();

    // Debug: Log final classes on controller
    logger.info(`Controller classes after creation: ${wrapper.className}`);

    logger.debug('initializeControls End');
    return wrapper;
  }

  /**
   * Insert controller into DOM with site-specific positioning
   * @param {Document} document - Document object
   * @param {HTMLElement[]} wrappers - Wrapper elements to insert
   * @private
   */
  insertIntoDOM(document, wrappers) {
    wrappers.forEach((wrapper) => {
      const fragment = document.createDocumentFragment();
      fragment.appendChild(wrapper);

      // Get site-specific positioning information
      const positioning = siteHandlerManager.getControllerPosition(this.parent, this.video);

      switch (positioning.insertionMethod) {
        case 'beforeParent':
          positioning.insertionPoint.parentElement.insertBefore(
            fragment,
            positioning.insertionPoint
          );
          break;

        case 'afterParent':
          positioning.insertionPoint.parentElement.insertBefore(
            fragment,
            positioning.insertionPoint.nextSibling
          );
          break;

        case 'firstChild':
        default:
          positioning.insertionPoint.insertBefore(fragment, positioning.insertionPoint.firstChild);
          break;
      }

      logger.debug(`Controller inserted using ${positioning.insertionMethod} method`, wrapper);
    });
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
          const controller = this.div;
          if (!mutation.target.src && !mutation.target.currentSrc) {
            controller.classList.add('vsc-nosource');
          } else {
            controller.classList.remove('vsc-nosource');

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

  /**
   * Remove controller and clean up
   */
  remove() {
    logger.debug('Removing VideoController');

    // Remove DOM element
    if (this.div && this.div.parentNode) {
      this.div.remove();
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

  adjustLocation() {
    // getBoundingClientRect is relative to the viewport; style coordinates
    // are relative to offsetParent, so we adjust for that here. offsetParent
    // can be null if the video has `display: none` or is not yet in the DOM.
    const offsetRect = this.video.offsetParent?.getBoundingClientRect();
    const rect = this.video.getBoundingClientRect();

    let top = Math.max(rect.top - (offsetRect?.top || 0), 0);
    let left = Math.max(rect.left - (offsetRect?.left || 0), 0);

    // Couldn't figure out a proper way, so hacking it!
    if (location.hostname.match(/totaltypescript.com/)) {
      top = Math.max(rect.top - (rect?.top || 0), 0);
      left = Math.max(rect.left - (rect?.left || 0), 0);
    }

    // this.controller.style.left = `${left}px`;
    // this.controller.style.top = `${top}px`;
    this.div.style.transform = `translate(${left}px, ${top}px)`;
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
    const isCurrentlyHidden = this.div.classList.contains('vsc-hidden');

    // Special handling for audio elements - don't hide controllers for functional audio
    if (this.video.tagName === 'AUDIO') {
      // For audio, only hide if manually hidden or if audio support is disabled
      if (!this.config.settings.audioBoolean && !isCurrentlyHidden) {
        this.div.classList.add('vsc-hidden');
        logger.debug('Hiding audio controller - audio support disabled');
      } else if (
        this.config.settings.audioBoolean &&
        isCurrentlyHidden &&
        !this.div.classList.contains('vsc-manual')
      ) {
        // Show audio controller if audio support is enabled and not manually hidden
        this.div.classList.remove('vsc-hidden');
        logger.debug('Showing audio controller - audio support enabled');
      }

      return;
    }

    // Original logic for video elements
    if (
      isVisible &&
      isCurrentlyHidden &&
      !this.div.classList.contains('vsc-manual') &&
      !this.config.settings.startHidden
    ) {
      // Video became visible and controller is hidden (but not manually hidden)
      this.div.classList.remove('vsc-hidden');
      logger.debug('Showing controller - video became visible');
    } else if (!isVisible && !isCurrentlyHidden) {
      // Video became invisible and controller is visible
      this.div.classList.add('vsc-hidden');
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

    this.shadowManager.progressContainerDiv.style.display = 'flex';
    this.shadowManager.progressText.textContent = `${percent}%`;
    this.shadowManager.progressLine.style.width = `${percent}%`;
  }
}

// Create singleton instance
window.VSC.VideoController = VideoController;

// Global variables available for both browser and testing
