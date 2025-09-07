/**
 * Event management system for Video Speed Controller
 *
 * @typedef {import('../core/video-controller.js').VideoController} VideoController
 * @typedef {import('../core/config.js').VideoSpeedConfig} VideoSpeedConfig
 */

window.VSC = window.VSC || {};

import { logger } from '../utils/logger.js';
import * as dom from '../utils/dom-utils.js';
import { stateManager } from '../core/state-manager.js';
import { SPEED_LIMITS } from '../shared/constants.js';

export class EventManager {
  /**
   * @param {VideoSpeedConfig} config - config handler
   */
  constructor(config, actionHandler) {
    this.config = config;
    this.actionHandler = actionHandler;
    this.listeners = new Map();
    this.coolDown = false;
    this.timer = null;

    this.leaderKeyHeld = false;

    // Event deduplication to prevent duplicate key processing
    this.lastKeyEventSignature = null;
  }

  /**
   * Set up all event listeners
   * @param {Document} document - Document to attach events to
   */
  setupEventListeners(document) {
    this.setupKeyboardShortcuts(document);
    this.setupRateChangeListener(document);
  }

  /**
   * Set up keyboard shortcuts
   * @param {Document} document - Document to attach events to
   */
  setupKeyboardShortcuts(document) {
    const docs = [document];

    try {
      if (dom.inIframe()) {
        docs.push(window.top.document);
      }
    } catch {
      // Cross-origin iframe - ignore
    }

    docs.forEach((doc) => {
      const keyDownHandler = (event) => this.handleKeyDown(event);
      const keyUpHandler = (event) => this.handleKeyUp(event);

      doc.addEventListener('keydown', keyDownHandler, true);
      doc.addEventListener('keyup', keyUpHandler, true);

      // Store reference for cleanup
      if (!this.listeners.has(doc)) {
        this.listeners.set(doc, []);
      }
      this.listeners.get(doc).push({
        type: 'keydown',
        handler: keyDownHandler,
        useCapture: true,
      });
    });
  }

  /**
   * Handle keydown events
   * @param {KeyboardEvent} event - Keyboard event
   * @private
   */
  handleKeyUp(event) {
    if (event.key === 'q') {
      this.leaderKeyHeld = false;
    }

    const actionItem = this.config.getActionByKeyEvent(event);

    if (actionItem) {
      const wasHandled = this.actionHandler.runAction({ actionItem, event, isKeyUp: true });
      if (!wasHandled) {
        return; // Let it go through normally
      }

      if (actionItem.force) {
        // Disable website's key bindings
        event.preventDefault();
        event.stopPropagation();
      }
    }
  }

  /**
   * Handle keydown events
   * @param {KeyboardEvent} event - Keyboard event
   * @private
   */
  handleKeyDown(event) {
    const { key } = event;

    // if (event.key !== 'q' && !this.leaderKeyHeld) return;
    // if (event.key === 'q' && this.leaderKeyHeld) return;
    //
    // if (event.key === 'q') {
    //   this.leaderKeyHeld = true;
    // }

    logger.verbose(`Processing keydown event: key=${event.key}, code=${event.code}`);

    // Event deduplication - prevent same key event from being processed multiple times
    const eventSignature = `${key}_${event.timeStamp}_${event.type}`;

    if (this.lastKeyEventSignature === eventSignature) {
      return;
    }

    this.lastKeyEventSignature = eventSignature;

    // Ignore if following modifier is active
    if (this.hasActiveModifier(event)) {
      logger.debug(`Keydown event ignored due to active modifier: ${key}`);
      return;
    }

    // Ignore keydown event if typing in an input box
    if (this.isTypingContext(event.target)) {
      return false;
    }

    // Ignore keydown event if no media elements are present
    const mediaElements = stateManager.getControlledElements();
    if (!mediaElements.length) {
      return false;
    }

    const actionItem = this.config.getActionByKeyEvent(event);

    if (actionItem) {
      const wasHandled = this.actionHandler.runAction({ actionItem, event });
      if (!wasHandled) {
        return; // Let it go through normally
      }

      if (actionItem.force) {
        // Disable website's key bindings
        event.preventDefault();
        event.stopPropagation();
      }
    } else {
      logger.debug(`No key binding found for keyCode: ${key}`);
    }

    return false;
  }

  /**
   * Check if any modifier keys are active
   * @param {KeyboardEvent} event - Keyboard event
   * @returns {boolean} True if modifiers are active
   * @private
   */
  hasActiveModifier(event) {
    return (
      !event.getModifierState ||
      event.getModifierState('Control') ||
      event.getModifierState('Fn') ||
      event.getModifierState('Meta') ||
      event.getModifierState('Hyper') ||
      event.getModifierState('OS')
    );
  }

  /**
   * Check if user is typing in an input context
   * @param {Element} target - Event target
   * @returns {boolean} True if typing context
   * @private
   */
  isTypingContext(target) {
    return (
      target.nodeName === 'INPUT' ||
      target.nodeName === 'TEXTAREA' ||
      target.isContentEditable ||
      target.nodeName === 'SHREDDIT-COMPOSER'
    );
  }

  /**
   * Set up rate change event listener
   * @param {Document} document - Document to attach events to
   */
  setupRateChangeListener(document) {
    const rateChangeHandler = (event) => this.handleRateChange(event);
    document.addEventListener('ratechange', rateChangeHandler, true);

    // Store reference for cleanup
    if (!this.listeners.has(document)) {
      this.listeners.set(document, []);
    }
    this.listeners.get(document).push({
      type: 'ratechange',
      handler: rateChangeHandler,
      useCapture: true,
    });
  }

  /**
   * Handle rate change events
   * @param {Event} event - Rate change event
   * @private
   */
  handleRateChange(event) {
    logger.warn('FMFOO[5]: event-manager.js:220 (after handleRateChange(event) )');
    // MyNote | I don't think I need this as I disabled CustomEvent in action-handler's
    //              setSpeed (no idea why it's there TBH).
    // if (this.coolDown) {
    //   logger.debug('Rate change event blocked by cooldown');
    //
    //   // Get the video element to restore authoritative speed
    //   const video = event.composedPath ? event.composedPath()[0] : event.target;
    //
    //   // RESTORE our authoritative value since external change already happened
    //   if (video.vsc && this.config.settings.lastSpeed !== undefined) {
    //     const authoritativeSpeed = this.config.settings.lastSpeed;
    //     if (Math.abs(video.playbackRate - authoritativeSpeed) > 0.01) {
    //       logger.info(
    //         `Restoring speed during cooldown from external ${video.playbackRate} to authoritative ${authoritativeSpeed}`
    //       );
    //       video.playbackRate = authoritativeSpeed;
    //     }
    //   }
    //
    //   event.stopImmediatePropagation();
    //   return;
    // }

    // Get the actual video element (handle shadow DOM)
    const video = event.composedPath ? event.composedPath()[0] : event.target;

    // Skip if no VSC controller attached
    if (!video.vsc) {
      logger.debug('Skipping ratechange - no VSC controller attached');
      return;
    }

    // Check if this is our own event
    if (event.detail && event.detail.origin === 'videoSpeed') {
      // This is our change, don't process it again
      logger.debug('Ignoring extension-originated rate change');
      return;
    }

    // MyNote: this prevents my speed changes (UI updates but video speed doesn't change),
    //         so disabling it!
    // Force last saved speed mode - restore authoritative speed for ANY external change
    // if (this.config.settings.forceLastSavedSpeed) {
    //   if (event.detail && event.detail.origin === 'videoSpeed') {
    //     video.playbackRate = Number(event.detail.speed);
    //   } else {
    //     const authoritativeSpeed = this.config.settings.lastSpeed || 1.0;
    //     logger.info(`Force mode: restoring external ${video.playbackRate} to authoritative ${authoritativeSpeed}`);
    //     video.playbackRate = authoritativeSpeed;
    //   }
    //   event.stopImmediatePropagation();
    //   return;
    // }

    // Ignore external ratechanges during video initialization
    if (video.readyState < 1) {
      logger.debug('Ignoring external ratechange during video initialization (readyState < 1)');
      event.stopImmediatePropagation();
      return;
    }

    // External change - use adjustSpeed with external source
    const rawExternalRate = typeof video.playbackRate === 'number' ? video.playbackRate : NaN;

    // Ignore spurious external ratechanges below our supported MIN to avoid persisting clamped 0.07
    const min = SPEED_LIMITS.MIN;
    // Use <= to also catch values that Chrome already clamped to MIN (e.g., site set 0)
    if (!isNaN(rawExternalRate) && rawExternalRate <= min) {
      logger.debug(`Ignoring external ratechange below MIN: raw=${rawExternalRate}, MIN=${min}`);
      event.stopImmediatePropagation();
      return;
    }

    this.actionHandler?.adjustSpeed(video, video.playbackRate, {
      source: 'external',
    });

    // Always stop propagation to prevent loops
    event.stopImmediatePropagation();
  }

  /**
   * Start cooldown period to prevent event spam
   */
  refreshCoolDown() {
    logger.debug('Begin refreshCoolDown');

    if (this.coolDown) {
      clearTimeout(this.coolDown);
    }

    this.coolDown = setTimeout(() => {
      this.coolDown = false;
    }, EventManager.COOLDOWN_MS);

    logger.debug('End refreshCoolDown');
  }

  /**
   * Show controller temporarily
   * @param {Element} controller - Controller element
   */
  showController(controller) {
    // When startHidden is enabled, only show temporary feedback if the user has
    // previously interacted with this controller manually (vsc-manual class)
    // This prevents unwanted controller appearances on pages where user wants them hidden
    if (this.config.settings.startHidden && !controller.classList.contains('vsc-manual')) {
      logger.info(
        `Controller respecting startHidden setting - no temporary display (startHidden: ${this.config.settings.startHidden}, manual: ${controller.classList.contains('vsc-manual')})`
      );
      return;
    }

    logger.info(
      `Showing controller temporarily (startHidden: ${this.config.settings.startHidden}, manual: ${controller.classList.contains('vsc-manual')})`
    );

    const wasHidden = controller.classList.contains('hidden');

    // controller.classList.add('vsc-show');
    controller.classList.remove('hidden');

    clearTimeout(this.timer);

    this.timer = setTimeout(() => {
      this.timer = null;

      if (wasHidden) {
        // controller.classList.remove('vsc-show');
        controller.classList.add('hidden');

        logger.debug('Hiding controller');
      }
    }, 2000);
  }

  /**
   * Clean up all event listeners
   */
  cleanup() {
    this.listeners.forEach((eventList, doc) => {
      eventList.forEach(({ type, handler, useCapture }) => {
        try {
          doc.removeEventListener(type, handler, useCapture);
        } catch (e) {
          logger.warn(`Failed to remove event listener: ${e.message}`);
        }
      });
    });

    this.listeners.clear();

    if (this.coolDown) {
      clearTimeout(this.coolDown);
      this.coolDown = false;
    }

    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }
}

// Cooldown duration (ms) for ratechange handling
EventManager.COOLDOWN_MS = 200;

// Create singleton instance
window.VSC.EventManager = EventManager;
