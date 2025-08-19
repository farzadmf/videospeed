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
      doc.addEventListener('keydown', keyDownHandler, true);

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
  handleKeyDown(event) {
    const { key } = event;

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
      logger.verbose(`No key binding found for keyCode: ${key}`);
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
      event.getModifierState('Alt') ||
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
    // MyNote | I don't think I need this as I disabled CustomEvent in action-handler's
    //              setSpeed (no idea why it's there TBH).
    // if (this.coolDown) {
    //   logger.debug('Rate change event blocked by cooldown');
    //   event.stopImmediatePropagation();
    //   return;
    // }

    // Get the actual video element (handle shadow DOM)
    const video = event.composedPath ? event.composedPath()[0] : event.target;

    // Skip if no VSC controller attached
    if (!video.vsc) {
      return;
    }

    // Check if this is our own event
    if (event.detail && event.detail.origin === 'videoSpeed') {
      // This is our change, don't process it again
      logger.debug('Ignoring extension-originated rate change');
      return;
    }

    // External change - use adjustSpeed with external source
    logger.debug('External rate change detected');
    if (this.actionHandler) {
      this.actionHandler.adjustSpeed(video, video.playbackRate, {
        source: 'external',
      });
    }

    // Always stop propagation to prevent loops
    event.stopImmediatePropagation();
  }

  /**
   * Update speed indicators and storage when rate changes
   * @param {HTMLMediaElement & { vsc?: VideoController }} video - Video element
   * @private
   */
  // MyNote | Well, seems like with all the things I disabled in handleRateChange, this
  //              method became redundant, so ...
  // updateSpeedFromEvent(video) {
  //   // Check if video has a controller attached
  //   if (!video.vsc) {
  //     return;
  //   }
  //
  //   const src = video.currentSrc;
  //   const url = getBaseURL(src);
  //   const speed = Number(video.playbackRate.toFixed(1));
  //
  //   logger.info(`Playback rate changed to ${speed}`);
  //
  //   video.vsc.setSpeedVal(speed);
  //
  //   this.config.syncSpeedValue({ speed, url });
  //
  //   // MyNote | why wouldn't this be available?!
  //   // Save to Chrome storage if available
  //   // if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
  //   //   logger.debug('Syncing chrome settings for lastSpeed');
  //   //   chrome.storage.sync.set({ lastSpeed: speed }, () => {
  //   //     logger.debug(`Speed setting saved: ${speed}`);
  //   //   });
  //   // } else {
  //   //   logger.debug('Chrome storage not available, skipping speed sync');
  //   // }
  //
  //   // Show controller briefly if hidden
  //   this.actionHandler.runAction({ actionItem: 'blink' });
  // }

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
    }, 1000);

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

// Create singleton instance
window.VSC.EventManager = EventManager;
