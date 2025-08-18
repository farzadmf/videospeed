/**
 * Video Controller class for managing individual video elements
 */

window.VSC = window.VSC || {};

import { getBaseURL } from '../utils/url.js';
import { logger } from '../utils/logger.js';
import { ControlsManager } from '../ui/controls-manager.js';
import { ShadowDOMManager } from '../ui/shadow-dom-manager.js';
import { siteHandlerManager } from '../site-handlers/manager.js';
import { formatSpeed, formatVolume } from '../shared/constants.js';
import { stateManager } from './state-manager.js';
import { VSCControllerElement } from '../ui/element.js';

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

    this.documentTitle = document.title;

    this.video = target;
    this.parent = target.parentElement || parent;
    this.config = config;
    this.actionHandler = actionHandler;
    this.controlsManager = new ControlsManager(actionHandler, config);
    this.shadowManager = new ShadowDOMManager(target);
    this.shouldStartHidden = shouldStartHidden;

    this.targetObserver = null;
    this.intersectionObserver = null;
    this.videoResizeObserver = null;
    this.titleObserver = null;
    this.isInternalTitleUpdate = false;

    this.scrollListener = null;
    this.resizeListener = null;

    this.isVisible = true;

    this.abortController = new AbortController();
    this.signal = this.abortController.signal;

    // Throttled scroll listener for smooth updates
    this.scrollTicking = false;
    this.resizeTicking = false;

    this.scrollListener = () => {
      if (!this.scrollTicking) {
        requestAnimationFrame(() => {
          logger.verbose('[scrollListener] Video is visible; adjusting location');
          this.shadowManager.adjustLocation();
          this.scrollTicking = false;
        });
        this.scrollTicking = true;
      }
    };
    this.resizeListener = () => {
      if (!this.resizeTicking) {
        requestAnimationFrame(() => {
          logger.verbose('[resizeListener] Video is visible; adjusting location');
          this.shadowManager.adjustLocation();
          this.resizeTicking = false;
        });
        this.resizeTicking = true;
      }
    };

    // Adding this to DOM in the same location as upstream VSC to listen for style changes etc.
    this.spyDiv = document.createElement('div');
    this.spyDiv.setAttribute('id', 'vsc-spy');

    siteHandlerManager.setup({
      onHide: () => this.shadowManager.hideController(),
      onShow: () => this.shadowManager.showController(),
      signal: this.signal,
      spyDiv: this.spyDiv,
      video: target,
    });

    this.speed = 0;
    this.volume = 0;

    // Generate unique controller ID for badge tracking
    this.controllerId = this.generateControllerId(target);

    // Transient reset memory (not persisted, per-controller)
    this.speedBeforeReset = null;

    // Attach controller to video element first (needed for adjustSpeed)
    target.vsc = this;

    // Initialize speed
    this.initializeSpeed();

    // Create custom element wrapper to avoid CSS conflicts
    this.wrapperDiv = new VSCControllerElement();

    // Create UI
    this.initializeControls();

    this.handlePlay = null;
    this.handleSeek = null;

    this.handleTimeUpdate = null;
    this.handleVolumeChange = null;

    this.startHandlers();

    this.controllerDiv = this.shadowManager.controllerDiv;
    this.progressDiv = this.shadowManager.progressDiv;

    logger.info('VideoController initialized for video element');

    stateManager.registerController(this);
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
      this.wrapperDiv.style.setProperty('--controller-visibility', 'hidden');

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
    // wrapper.style.cssText = styleText;

    // MyNote: using my own things instead of this
    // // Create shadow DOM with relative positioning inside shadow root
    // const shadow = window.VSC.ShadowDOMManager.createShadowDOM(wrapper, {
    //   top: '0px', // Position relative to shadow root since wrapper is already positioned
    //   left: '0px', // Position relative to shadow root since wrapper is already positioned
    //   speed: speed,
    //   opacity: this.config.settings.controllerOpacity,
    //   buttonSize: this.config.settings.controllerButtonSize,
    // });

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

    document.body.appendChild(fragment);

    // Get site-specific positioning information
    const { insertionPoint, insertionMethod } = siteHandlerManager.getControllerPosition(
      this.parent,
      this.video
    );

    switch (insertionMethod) {
      case 'beforeParent':
        // insertionPoint.parentElement.insertBefore(fragment, insertionPoint);
        insertionPoint.parentElement.insertBefore(this.spyDiv, insertionPoint);
        break;

      case 'afterParent':
        // insertionPoint.parentElement.insertBefore(fragment, insertionPoint.nextSibling);
        insertionPoint.parentElement.insertBefore(this.spyDiv, insertionPoint.nextSibling);
        break;

      case 'firstChild':
      default:
        // insertionPoint.insertBefore(fragment, insertionPoint.firstChild);
        insertionPoint.insertBefore(this.spyDiv, insertionPoint.firstChild);
        break;
    }

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

    if (!this.handlePlay) {
      this.handlePlay = mediaEventAction.bind(this);
      this.video.addEventListener('play', this.handlePlay, { signal: this.signal });
    }
    if (!this.handleSeek) {
      this.handleSeek = mediaEventAction.bind(this);
      this.video.addEventListener('seeked', this.handleSeek, { signal: this.signal });
    }

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

    if (!this.handleTimeUpdate) {
      this.handleTimeUpdate = timeUpdateAction.bind(this);
      this.video.addEventListener('timeupdate', this.handleTimeUpdate, { signal: this.signal });
    }
    if (!this.handleVolumeChange) {
      this.handleVolumeChange = volumeChangeAction.bind(this);
      this.video.addEventListener('volumechange', this.handleVolumeChange, { signal: this.signal });
    }

    logger.debug('Added essential media event handlers: play, seeked');
  }

  /**
   * Set up mutation observer for src attribute changes
   * @private
   */
  setupMutationObserver() {
    if (this.targetObserver) return;

    this.targetObserver = new MutationObserver((mutations) => {
      if (this.signal.aborted) {
        this.targetObserver.disconnect();
        return;
      }

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
    if (this.intersectionObserver) return;

    this.intersectionObserver = new IntersectionObserver(
      (entries) => {
        if (this.signal.aborted) {
          this.intersectionObserver.disconnect();
          return;
        }

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

  setupVideoResizeObserver() {
    if (this.videoResizeObserver) return;

    this.videoResizeObserver = new ResizeObserver(() => this.shadowManager.adjustLocation());

    this.videoResizeObserver.observe(this.video);
  }

  setupTitleObserver() {
    if (this.titleObserver) return;

    this.titleObserver = new MutationObserver(() => {
      if (!this.isInternalTitleUpdate) {
        this.documentTitle = document.title;
      }
    });

    this.titleObserver.observe(document.querySelector('title'), { childList: true });
  }

  startScrollListener() {
    window.addEventListener('scroll', this.scrollListener, { signal: this.signal });
  }
  stopScrollListener() {
    window.removeEventListener('scroll', this.scrollListener);
  }

  startResizeListener() {
    window.addEventListener('resize', this.resizeListener, { signal: this.signal });
  }
  stopResizeListener() {
    window.removeEventListener('resize', this.resizeListener);
  }

  startHandlers() {
    // Set up event handlers
    this.setupEventHandlers();

    // Set up mutation observer for src changes
    this.setupMutationObserver();
    this.setupIntersectionObserver();
    this.setupVideoResizeObserver();
    this.setupTitleObserver();
  }

  stopHandlers() {
    // Remove event listeners by aborting
    this.abortController.abort();

    this.handlePlay = null;
    this.handleSeek = null;

    this.handleTimeUpdate = null;
    this.handleVolumeChange = null;

    // Disconnect mutation observer
    this.targetObserver?.disconnect();
    this.intersectionObserver?.disconnect();
    this.videoResizeObserver?.disconnect();
    this.titleObserver?.disconnect();

    this.targetObserver = null;
    this.intersectionObserver = null;
    this.videoResizeObserver = null;
  }

  /**
   * Remove controller and clean up
   */
  remove() {
    logger.debug('Removing VideoController');

    // Remove DOM element
    this.wrapperDiv?.remove();

    this.stopHandlers();

    stateManager.removeController(this.controllerId);

    // Remove reference from video element
    delete this.video.vsc;

    logger.debug('VideoController removed successfully');
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
    logger.debug('[isVideoVisible] start', this.video);

    // Check if video is still connected to DOM
    if (!this.video.isConnected) {
      logger.debug('[isVideoVisible] video is NOT connected');
      return false;
    }

    // Check computed style for visibility
    const style = window.getComputedStyle(this.video);
    if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
      logger.debug('[isVideoVisible] video style makes it hidden');
      return false;
    }

    // Check if video has reasonable dimensions
    const rect = this.video.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) {
      logger.debug('[isVideoVisible] video has width or height set to 0');
      return false;
    }

    logger.debug('[isVideoVisible] video IS visible');
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
      this.startHandlers();
      logger.debug('Showing controller - video became visible');
    } else if (!isVisible && !isCurrentlyHidden) {
      // Video became invisible and controller is visible
      this.controllerDiv.classList.add('vsc-hidden');
      this.stopHandlers();
      logger.debug('Hiding controller - video became invisible');
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

    this.isInternalTitleUpdate = true;
    if (value > 0.0001 && value < 1.0) {
      document.title = `(${percent}%) ${this.documentTitle}`;
    } else {
      document.title = this.documentTitle;
    }
    setTimeout(() => (this.isInternalTitleUpdate = false), 50);

    this.shadowManager.progressDiv.style.display = 'flex';
    this.shadowManager.progressText.textContent = `${percent}%`;
    this.shadowManager.progressLine.style.width = `${percent}%`;
  }
}

// Create singleton instance
window.VSC.VideoController = VideoController;

// Global variables available for both browser and testing
