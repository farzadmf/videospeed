/**
 * Control button interactions and event handling
 * Modular architecture using global variables
 */

window.VSC = window.VSC || {};

import { logger } from '../utils/logger.js';

export class ControlsManager {
  constructor(actionHandler, config) {
    this.actionHandler = actionHandler;
    this.config = config;
  }

  /**
   * Set up control button event listeners
   * @param {ShadowRoot} shadow - Shadow root containing controls
   * @param {HTMLVideoElement} video - Associated video element
   */
  setupControlEvents(shadow, video) {
    this.setupDragHandler(shadow);
    this.setupButtonHandlers(shadow);
    this.setupWheelHandler(shadow, video);
    this.setupClickPrevention(shadow);
  }

  /**
   * Set up drag handler for speed indicator
   * @param {ShadowRoot} shadow - Shadow root
   * @private
   */
  setupDragHandler(shadow) {
    const draggables = shadow.querySelectorAll('.draggable');

    draggables.forEach((draggable) => {
      draggable.addEventListener(
        'mousedown',
        (event) => {
          const draggable = event.target.closest('.draggable');
          const actionName = draggable.dataset['action'];

          this.actionHandler.runAction({ actionItem: actionName, event });

          event.stopPropagation();
          event.preventDefault();
        },
        true
      );
    });
  }

  /**
   * Set up button click handlers
   * @param {ShadowRoot} shadow - Shadow root
   * @private
   */
  setupButtonHandlers(shadow) {
    shadow.querySelectorAll('button').forEach((button) => {
      // Click handler
      button.addEventListener(
        'click',
        (event) => {
          const actionItem = this.config.getActionByName(event.target.dataset['action']);

          this.actionHandler.runAction({ actionItem, event });
          event.stopPropagation();
        },
        true
      );

      // Touch handler to prevent conflicts
      button.addEventListener(
        'touchstart',
        (event) => {
          event.stopPropagation();
        },
        true
      );
    });
  }

  /**
   * Set up mouse wheel handler for speed control
   * @param {ShadowRoot} shadow - Shadow root
   * @param {HTMLVideoElement} video - Video element
   * @private
   */
  setupWheelHandler(shadow, video) {
    const controller = shadow.querySelector('#controller');

    controller.addEventListener(
      'wheel',
      (event) => {
        event.preventDefault();

        const delta = Math.sign(event.deltaY);
        const step = 0.1;
        const speedDelta = delta < 0 ? step : -step;

        this.actionHandler.adjustSpeed(video, speedDelta, { relative: true });

        logger.debug(`Wheel control: adjusting speed by ${speedDelta}`);
      },
      { passive: false }
    );
  }

  /**
   * Set up click prevention for controller container
   * @param {ShadowRoot} shadow - Shadow root
   * @private
   */
  setupClickPrevention(shadow) {
    const controller = shadow.querySelector('#controller');

    // Prevent clicks from bubbling up to page
    controller.addEventListener('click', (e) => e.stopPropagation(), false);
    controller.addEventListener('mousedown', (e) => e.stopPropagation(), false);
  }
}

// Create singleton instance
window.VSC.ControlsManager = ControlsManager;
