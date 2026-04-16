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

    // UPSTREAM: Fight detection — track how many times a site resets our speed.
    // MyNote: We don't use fight-back; our adjustSpeed handles external ratechanges
    // by always restoring the saved speed. These fields exist for upstream parity.
    // If we ever face aggressive sites that cause rapid back-and-forth stuttering,
    // upstream's approach is to surrender after MAX_FIGHT_COUNT attempts.
    this.fightCount = 0;
    this.fightTimer = null;

    // UPSTREAM: User gesture tracking — timestamp of the last user interaction we
    // did NOT handle (click on page UI, unhandled key). A ratechange arriving within
    // USER_GESTURE_WINDOW_MS of this is treated as intentional and accepted
    // immediately rather than fought.
    // MyNote: We don't use this either since we always force saved speed. But if we
    // ever want to let users use native site controls (e.g. YouTube's speed menu),
    // this is the mechanism to detect that.
    this.lastUserInteractionAt = 0;
  }

  /**
   * Set up all event listeners
   * @param {Document} document - Document to attach events to
   */
  setupEventListeners(document) {
    this.setupKeyboardShortcuts(document);
    this.setupRateChangeListener(document);
    this.setupUserGestureListener(document);
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

      if (this.config.settings.exclusiveKeys) {
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

    // IME composition and dead key guard
    // 'Process' / keyCode 229 = IME composition active (CJK input)
    // 'Dead' = first keypress of a dead key sequence (e.g. ^ on French keyboard)
    if (
      event.isComposing ||
      event.keyCode === 229 ||
      event.key === 'Process' ||
      event.key === 'Dead'
    ) {
      return;
    }

    logger.verbose(`Processing keydown event: key=${event.key}, code=${event.code}`);

    // Event deduplication - prevent same key event from being processed multiple times
    const eventSignature = `${key}_${event.timeStamp}_${event.type}`;

    if (this.lastKeyEventSignature === eventSignature) {
      return;
    }

    this.lastKeyEventSignature = eventSignature;

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

      if (this.config.settings.exclusiveKeys) {
        event.preventDefault();
        event.stopPropagation();
      }
    } else {
      // UPSTREAM: Unhandled key — could be a site shortcut (e.g. YouTube's < > speed keys).
      // Mark as user interaction so an immediately-following ratechange is accepted.
      this.lastUserInteractionAt = event.timeStamp;
      logger.debug(`No key binding found for keyCode: ${key}`);
    }

    return false;
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
   * UPSTREAM: Track user interactions that originate outside the VSC controller.
   * Clicks on YouTube's speed menu (or any site's native speed UI) land here.
   * Unhandled keyboard events (e.g. YouTube's < > shortcuts) land in handleKeyDown.
   * Both update lastUserInteractionAt so handleRateChange can distinguish
   * intentional speed changes from automatic site-initiated resets.
   * @param {Document} document
   * @private
   */
  setupUserGestureListener(document) {
    const clickHandler = (event) => {
      // Skip clicks on our own controller (shadow host retargeted at boundary)
      if (event.target?.closest?.('vsc-controller')) {
        return;
      }
      this.lastUserInteractionAt = event.timeStamp;
    };
    document.addEventListener('click', clickHandler, true);

    if (!this.listeners.has(document)) {
      this.listeners.set(document, []);
    }
    this.listeners.get(document).push({ type: 'click', handler: clickHandler, useCapture: true });
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
    // UPSTREAM: Cooldown-based fight-back. When cooldown is active (we just set
    // speed ourselves), block external ratechanges and restore our speed.
    // MyNote: We don't use cooldown/CustomEvent tagging. Our adjustSpeed handles
    // external ratechanges by always restoring the saved speed, which self-terminates
    // after one extra cycle (setting playbackRate to the same value doesn't fire
    // ratechange). Upstream needs cooldown because their setSpeed dispatches a
    // CustomEvent and updates lastSpeed before touching playbackRate — without
    // cooldown, handleRateChange would misclassify their own change as external.
    // if (this.coolDown) {
    //   logger.debug('Rate change event blocked by cooldown');
    //   const video = event.composedPath ? event.composedPath()[0] : event.target;
    //   if (video.readyState < 1) {
    //     logger.debug('Skipping cooldown fight-back during video init (readyState < 1)');
    //     return;
    //   }
    //   if (video.vsc && this.config.settings.lastSpeed !== undefined) {
    //     const authoritativeSpeed = this.config.settings.lastSpeed;
    //     if (Math.abs(video.playbackRate - authoritativeSpeed) > 0.01) {
    //       logger.info(
    //         `Restoring speed during cooldown from external ${video.playbackRate} to authoritative ${authoritativeSpeed}`
    //       );
    //       this.siteHandlerManager.handleSpeedChange(video, authoritativeSpeed);
    //     }
    //   }
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
      logger.debug('Ignoring extension-originated rate change');
      return;
    }

    // Ignore external ratechanges during video initialization
    if (video.readyState < 1) {
      logger.debug('Ignoring external ratechange during video initialization (readyState < 1)');
      return;
    }

    const rawExternalRate = typeof video.playbackRate === 'number' ? video.playbackRate : NaN;

    // Ignore spurious external ratechanges below our supported MIN to avoid persisting clamped 0.07
    const min = SPEED_LIMITS.MIN;
    // Use <= to also catch values that Chrome already clamped to MIN (e.g., site set 0)
    if (!isNaN(rawExternalRate) && rawExternalRate <= min) {
      logger.debug(`Ignoring external ratechange below MIN: raw=${rawExternalRate}, MIN=${min}`);
      return;
    }

    // UPSTREAM: Fight-back with gesture detection and surrender.
    // MyNote: We don't use this. Our adjustSpeed restores saved speed for all
    // external ratechanges unconditionally. Two reasons upstream uses this instead:
    // 1. Surrender: after MAX_FIGHT_COUNT rapid resets, stop fighting to avoid
    //    stuttering on aggressive sites (DRM players, ad segments forcing 1x).
    // 2. Gesture detection: if user clicked/typed within USER_GESTURE_WINDOW_MS,
    //    accept the change as intentional (lets native site controls work).
    // If we ever face either issue, this is the mechanism to enable.
    // const authoritativeSpeed = this.config.settings.lastSpeed;
    // if (authoritativeSpeed && Math.abs(video.playbackRate - authoritativeSpeed) > 0.01) {
    //   const timeSinceGesture = event.timeStamp - this.lastUserInteractionAt;
    //   const isUserGesture = timeSinceGesture < EventManager.USER_GESTURE_WINDOW_MS;
    //   if (isUserGesture) {
    //     logger.info(
    //       `Accepting site speed change as user-intentional (gesture ${timeSinceGesture}ms ago): ${video.playbackRate}`
    //     );
    //     this.fightCount = 0;
    //     if (this.fightTimer) {
    //       clearTimeout(this.fightTimer);
    //       this.fightTimer = null;
    //     }
    //     this.lastUserInteractionAt = 0;
    //     if (this.actionHandler) {
    //       this.actionHandler.adjustSpeed(video, video.playbackRate);
    //     }
    //     return;
    //   }
    //   this.fightCount++;
    //   if (this.fightTimer) {
    //     clearTimeout(this.fightTimer);
    //   }
    //   this.fightTimer = setTimeout(() => {
    //     this.fightCount = 0;
    //     this.fightTimer = null;
    //   }, EventManager.FIGHT_WINDOW_MS);
    //   if (this.fightCount >= EventManager.MAX_FIGHT_COUNT) {
    //     logger.info(
    //       `Fight detection: surrendering after ${this.fightCount} resets. Accepting site speed ${video.playbackRate}`
    //     );
    //     this.fightCount = 0;
    //     // Fall through to accept the external change below
    //   } else {
    //     const cooldown = Math.min(
    //       EventManager.BASE_COOLDOWN_MS * Math.pow(2, this.fightCount - 1),
    //       EventManager.MAX_COOLDOWN_MS
    //     );
    //     logger.info(
    //       `Fight detection: attempt ${this.fightCount}/${EventManager.MAX_FIGHT_COUNT}, re-applying ${authoritativeSpeed} (cooldown ${cooldown}ms)`
    //     );
    //     this.siteHandlerManager.handleSpeedChange(video, authoritativeSpeed);
    //     this.refreshCoolDown(cooldown);
    //     event.stopImmediatePropagation(); // UPSTREAM: kept — active override, block site handler
    //     return;
    //   }
    // }

    this.actionHandler?.adjustSpeed(video, video.playbackRate, {
      source: 'external',
    });
  }

  /**
   * Start cooldown period to prevent event spam
   */
  refreshCoolDown(duration = EventManager.COOLDOWN_MS) {
    logger.debug(`Begin refreshCoolDown (${duration}ms)`);

    if (this.coolDown) {
      clearTimeout(this.coolDown);
    }

    this.coolDown = setTimeout(() => {
      this.coolDown = false;
    }, duration);

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

    if (this.fightTimer) {
      clearTimeout(this.fightTimer);
      this.fightTimer = null;
    }
    this.fightCount = 0;

    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }
}

// UPSTREAM: Time window (ms) after a user interaction in which an external ratechange
// is treated as user-intentional (site native controls) rather than fought back.
EventManager.USER_GESTURE_WINDOW_MS = 300;

// Cooldown duration (ms) for ratechange handling; doubles each fight-back retry
EventManager.COOLDOWN_MS = 200;

// UPSTREAM: Also aliased as BASE_COOLDOWN_MS for fight-back exponential backoff
EventManager.BASE_COOLDOWN_MS = EventManager.COOLDOWN_MS;

// UPSTREAM: Maximum cooldown duration (ms) during fight-back backoff
EventManager.MAX_COOLDOWN_MS = 2000;

// UPSTREAM: Fight detection — surrender after this many rapid site-initiated resets
EventManager.MAX_FIGHT_COUNT = 5;

// UPSTREAM: Fight detection — reset fight count after this quiet period (ms)
EventManager.FIGHT_WINDOW_MS = EventManager.MAX_COOLDOWN_MS + 1000;

// Create singleton instance
window.VSC.EventManager = EventManager;
