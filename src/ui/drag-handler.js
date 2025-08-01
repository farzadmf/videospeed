/**
 * Drag functionality for video controller
 * Modular architecture using global variables
 */

window.VSC = window.VSC || {};

import * as dom from '../utils/dom-utils.js';
import { logger } from '../utils/logger.js';

export class DragHandler {
  /**
   * Handle dragging of video controller
   * @param {HTMLVideoElement} video - Video element
   * @param {MouseEvent} event - Mouse event
   */
  static handleDrag({ video, event, wrapperDiv }) {
    // const controller = video.vsc?.div || video;
    // const shadowController =
    //   controller.shadowRoot.querySelector('#controller') ||
    //   controller.shadowRoot.querySelector('#vsc-progress-container');

    // MyNote: Using the same names as upstream to help matching logic against it.
    const controller = wrapperDiv;
    const shadowController = video;

    // Find nearest parent of same size as video parent
    const parentElement = dom.findVideoParent(controller);

    video.classList.add('vcs-dragging');
    shadowController.classList.add('dragging');

    const initialMouseXY = [event.clientX, event.clientY];
    const initialControllerXY = [
      parseInt(shadowController.style.left) || 0,
      parseInt(shadowController.style.top) || 0,
    ];

    const startDragging = (e) => {
      const style = shadowController.style;
      const dx = e.clientX - initialMouseXY[0];
      const dy = e.clientY - initialMouseXY[1];

      style.left = `${initialControllerXY[0] + dx}px`;
      style.top = `${initialControllerXY[1] + dy}px`;
    };

    const stopDragging = () => {
      parentElement.removeEventListener('mousemove', startDragging);
      parentElement.removeEventListener('mouseup', stopDragging);
      parentElement.removeEventListener('mouseleave', stopDragging);

      shadowController.classList.remove('dragging');
      video.classList.remove('vcs-dragging');

      logger.debug('Drag operation completed');
    };

    parentElement.addEventListener('mouseup', stopDragging);
    parentElement.addEventListener('mouseleave', stopDragging);
    parentElement.addEventListener('mousemove', startDragging);

    logger.debug('Drag operation started');
  }
}

// Create singleton instance
window.VSC.DragHandler = DragHandler;
