/**
 * Shadow DOM creation and management
 */

window.VSC = window.VSC || {};

import { logger } from '../utils/logger.js';
import { formatVolume } from '../shared/constants.js';
import { toPx } from '../utils/misc.js';

export class ShadowDOMManager {
  /**
   * @param {HTMLMediaElement & { vsc?: VideoController }} target - Video element
   */
  constructor(target) {
    this.target = target;

    /** @type {HTMLDivElement|null} */
    this.controllerDiv = null;
    /** @type {HTMLDivElement|null} */
    this.progressDiv = null;

    /** @type {ShadowRoot|null} */
    this.shadow = null;

    this.controller = null;
    this.controls = null;
    this.progressLine = null;
    this.progressLineContainer = null;
    this.progressText = null;
    this.speedIndicator = null;
    this.volumeIndicator = null;
    this.buttons = [];

    this.progressDivHeightPx = 20;

    this.cssText = document.querySelector('#vsc-shadow-css-content').textContent;

    this.top = 0;
    this.left = 0;

    // Clean up temporary element
    // setTimeout(() => document.querySelector('#vsc-shadow-css-content')?.remove(), 500);
  }

  /**
   * Create shadow DOM for video controller
   * @param {HTMLElement} wrapper - Wrapper element
   * @param {Object} options - Configuration options
   * @param {number} [options.buttonSize=14] - Size of control buttons in pixels
   * @param {string} [options.speed='1.0'] - Initial playback speed display value
   * @param {string} [options.volume='1.0'] - Initial volume display value
   */
  createShadowDOM(wrapper, options = {}) {
    const { buttonSize = 14, speed = '1.0', volume = '1.0' } = options;

    const { top = 0, left = 0 } = this.calculatePosition();

    this.shadow = wrapper.attachShadow({ mode: 'open' });

    // Create style element with embedded CSS
    const style = document.createElement('style');
    style.textContent = this.cssText;
    this.shadow.appendChild(style);

    const progressStyle = document.createElement('style');
    progressStyle.textContent = this.cssText;

    const topContainerDiv = document.createElement('div');
    topContainerDiv.id = 'vsc-top-container';
    this.shadow.appendChild(topContainerDiv);

    this.progressDiv = document.createElement('div');
    this.progressDiv.id = 'vsc-progress';
    this.progressDiv.className = 'draggable';
    this.progressDiv.setAttribute('data-action', 'drag');
    this.progressDiv.style.setProperty('--height', toPx(this.progressDivHeightPx));
    this.progressDiv.style.setProperty('--left', toPx(left));
    this.progressDiv.style.setProperty('--top', toPx(top));
    topContainerDiv.appendChild(this.progressDiv);

    // Create controller div
    this.controllerDiv = document.createElement('div');
    this.controllerDiv.id = 'controller';
    this.controllerDiv.className = 'vsc-controller draggable';
    this.controllerDiv.setAttribute('data-action', 'drag');
    this.controllerDiv.style.setProperty('--top', toPx(top));
    this.controllerDiv.style.setProperty('--left', toPx(left));
    topContainerDiv.appendChild(this.controllerDiv);

    // Create draggable speed indicator
    // const draggable = document.createElement('span');
    // draggable.setAttribute('data-action', 'drag');
    // draggable.className = 'draggable';
    // draggable.style.cssText = `font-size: ${buttonSize}px;`;
    // this.controllerDiv.appendChild(draggable);
    // topDiv.appendChild(draggable);

    this.progressLineContainer = document.createElement('div');
    this.progressLineContainer.setAttribute('id', 'vsc-progress-lines');
    this.progressDiv.appendChild(this.progressLineContainer);

    const progressFull = document.createElement('div');
    progressFull.setAttribute('id', 'vsc-progress-line-full');

    this.progressLine = document.createElement('div');
    this.progressLine.setAttribute('id', 'vsc-progress-line-live');

    this.progressLineContainer.appendChild(progressFull);
    this.progressLineContainer.appendChild(this.progressLine);

    this.speedIndicator = document.createElement('span');
    this.speedIndicator.id = 'vsc-speed-val';
    this.speedIndicator.setAttribute('data-action', 'drag');
    this.speedIndicator.textContent = `${speed}x`;

    this.volumeIndicator = document.createElement('span');
    this.volumeIndicator.id = 'vsc-volume-val';
    this.volumeIndicator.setAttribute('data-action', 'drag');
    this.volumeIndicator.textContent = `(vol: ${formatVolume(volume)})`;

    this.progressText = document.createElement('div');
    this.progressText.id = 'vsc-progress-val';
    this.progressText.textContent = '...';

    // draggable.appendChild(this.speedIndicator);
    // draggable.appendChild(document.createTextNode(' '));
    // draggable.appendChild(this.volumeIndicator);
    this.controllerDiv.appendChild(this.speedIndicator);
    this.controllerDiv.appendChild(document.createTextNode(' '));
    this.controllerDiv.appendChild(this.volumeIndicator);

    this.progressDiv.appendChild(this.progressText);

    // Create controls span
    const controls = document.createElement('span');
    controls.id = 'controls';
    controls.style.fontSize = `${buttonSize}px';`;
    controls.style.lineHeight = `${buttonSize}px';`;
    this.controllerDiv.appendChild(document.createTextNode(' '));
    this.controllerDiv.appendChild(controls);

    // Create buttons
    const buttons = [
      { action: 'rewind', text: '«', class: 'rw' },
      { action: 'slower', text: '−', class: '' },
      { action: 'faster', text: '+', class: '' },
      { action: 'advance', text: '»', class: 'rw' },
      { action: 'display', text: '×', class: 'hideButton' },
    ];

    buttons.forEach((btnConfig) => {
      const button = document.createElement('button');
      button.setAttribute('data-action', btnConfig.action);
      if (btnConfig.class) {
        button.className = btnConfig.class;
      }
      button.textContent = btnConfig.text;
      controls.appendChild(button);
    });

    logger.debug('Shadow DOM created for video controller');
  }

  /**
   * Get all buttons from shadow DOM
   * @returns {NodeList} Button elements
   */
  getButtons() {
    return this.shadow.querySelectorAll('button');
  }

  /**
   * Add skip segments to the progress bar
   * @param {number} totalDuration - Total duration of the video in seconds
   * @param {Array<Object>} segments - Array of segment objects
   * @param {number} segments[].start - Start time of the segment in seconds
   * @param {number} segments[].end - End time of the segment in seconds
   */
  addSkipSegments({ totalDuration, segments }) {
    segments.forEach((segment) => {
      const segmentDiv = document.createElement('div');
      segmentDiv.className = 'vsc-progress-line-segment';

      const leftPercent = (segment.start / totalDuration) * 100;
      const widthPercent = ((segment.end - segment.start) / totalDuration) * 100;

      segmentDiv.style.left = `${leftPercent}%`;
      segmentDiv.style.width = `${widthPercent}%`;

      this.progressLineContainer.appendChild(segmentDiv);
    });
  }

  /**
   * Calculate position for controller based on video element
   * @param {HTMLVideoElement} video - Video element
   * @returns {Object} Position object with top and left properties
   */
  calculatePosition() {
    logger.debug('[calculatePosition] start ...');

    const rect = this.target.getBoundingClientRect();

    // getBoundingClientRect is relative to the viewport; style coordinates
    // are relative to offsetParent, so we adjust for that here. offsetParent
    // can be null if the video has `display: none` or is not yet in the DOM.
    // const offsetRect = this.target.offsetParent?.getBoundingClientRect();
    // logger.debug('[calculatePosition] offsetRect', offsetRect);
    //
    // const top = Math.max(rect.top - (offsetRect?.top || 0), 0);
    // const left = Math.max(rect.left - (offsetRect?.left || 0), 0);
    const { top, left } = rect;

    logger.debug('[calculatePosition] end ... returning', 'top', top, 'left', left);
    return { top, left };
  }

  /**
   * Adjusts the location of the controller based on the video element's position
   */
  adjustLocation() {
    logger.debug('[adjustLocation] start ...');

    // const rect = this.target.getBoundingClientRect();
    // if (
    //   rect.bottom < 0 ||
    //   rect.top > window.innerHeight ||
    //   rect.right < 0 ||
    //   rect.left > window.innerWidth
    // ) {
    //   this.progressDiv.style.display = 'none';
    //   this.controllerDiv.style.display = 'none';
    //   return;
    // }
    //
    // this.progressDiv.style.display = 'block';
    // this.controllerDiv.style.display = 'block';

    if (!this.controllerDiv || !this.progressDiv) {
      logger.debug('[adjustLocation] controllerDiv or progressDiv not found; not doing anything');
      return;
    }

    const { left, top } = this.calculatePosition();
    this.top = top;
    this.left = left;
    logger.debug('[adjustLocation] top', top, 'left', left);

    const padding = 5;
    const pad = (value) => toPx(value + padding);

    this.progressDiv.style.left = pad(left);
    this.progressDiv.style.top = pad(top);

    this.controllerDiv.style.left = pad(left);
    this.controllerDiv.style.top = pad(top + this.progressDivHeightPx + 5);

    logger.debug('[adjustLocation] end ...');
  }

  hide() {
    this.hideController();
    this.progressDiv.style.display = 'none';
  }
  hideController() {
    this.controllerDiv.classList.add('hidden');
  }

  showController() {
    this.controllerDiv.classList.remove('hidden');
  }
  show() {
    this.showController();
    this.progressDiv.style.display = 'flex';
  }
}

// Create singleton instance
window.VSC.ShadowDOMManager = ShadowDOMManager;
