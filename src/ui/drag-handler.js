/**
 * Drag functionality for video controller
 * Uses pointer events for unified mouse + touch support
 */

window.VSC = window.VSC || {};

import { logger } from '../utils/logger.js';

export class DragHandler {
  /**
   * Handle dragging of video controller via pointer events
   * @param {HTMLVideoElement} video - Video element
   * @param {PointerEvent|MouseEvent} event - Pointer/mouse event
   */
  static handleDrag({ video, event }) {
    // MyNote: Using the same names as upstream to help matching logic against it.
    const shadowController = video;

    video.classList.add('vcs-dragging');
    shadowController.classList.add('dragging');

    const initialXY = [event.clientX, event.clientY];
    const initialControllerXY = [parseInt(shadowController.style.left) || 0, parseInt(shadowController.style.top) || 0];

    const draggable = event.target;

    // Capture pointer so all move/up events route here regardless of position
    if (event.pointerId !== undefined) {
      draggable.setPointerCapture(event.pointerId);
    }

    const onMove = (e) => {
      const dx = e.clientX - initialXY[0];
      const dy = e.clientY - initialXY[1];
      shadowController.style.left = `${initialControllerXY[0] + dx}px`;
      shadowController.style.top = `${initialControllerXY[1] + dy}px`;
    };

    const onEnd = () => {
      draggable.removeEventListener('pointermove', onMove);
      draggable.removeEventListener('pointerup', onEnd);
      draggable.removeEventListener('pointercancel', onEnd);
      // Mouse fallbacks
      draggable.removeEventListener('mousemove', onMove);
      draggable.removeEventListener('mouseup', onEnd);

      shadowController.classList.remove('dragging');
      video.classList.remove('vcs-dragging');

      logger.debug('Drag operation completed');
    };

    if (event.pointerId !== undefined) {
      draggable.addEventListener('pointermove', onMove);
      draggable.addEventListener('pointerup', onEnd);
      draggable.addEventListener('pointercancel', onEnd);
    } else {
      // Fallback for environments without pointer events
      draggable.addEventListener('mousemove', onMove);
      draggable.addEventListener('mouseup', onEnd);
    }

    logger.debug('Drag operation started');
  }
}

// Create singleton instance
window.VSC.DragHandler = DragHandler;
