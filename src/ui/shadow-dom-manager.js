/**
 * Shadow DOM creation and management
 * Modular architecture using global variables
 */

window.VSC = window.VSC || {};

import { logger } from '../utils/logger.js';

export class ShadowDOMManager {
  /**
   * @param {HTMLMediaElement & { vsc?: VideoController }} target - Video element
   */
  constructor(target) {
    this.target = target;

    /** @type {HTMLDivElement|null} */
    this.controllerDiv = null;
    /** @type {HTMLDivElement|null} */
    this.progressContainerDiv = null;

    /** @type {ShadowRoot|null} */
    this.shadow = null;
    /** @type {ShadowRoot|null} */
    this.progressShadow = null;

    this.controller = null;
    this.controls = null;
    this.progressLine = null;
    this.progressLineContainer = null;
    this.progressText = null;
    this.speedIndicator = null;
    this.volumeIndicator = null;
    this.buttons = [];

    this.cssText = document.querySelector('#vsc-shadow-css-content').textContent;

    // Clean up temporary element
    setTimeout(() => document.querySelector('#vsc-shadow-css-content')?.remove(), 500);
  }

  /**
   * Create shadow DOM for video controller
   * @param {HTMLElement} wrapper - Wrapper element
   * @param {HTMLElement} progressWrapper - Progress wrapper element
   * @param {Object} options - Configuration options
   * @param {number} [options.buttonSize=14] - Size of control buttons in pixels
   * @param {number} [options.opacity=0.3] - Controller opacity (0-1)
   * @param {string} [options.speed='1.0'] - Initial playback speed display value
   * @param {string} [options.volume='1.0'] - Initial volume display value
   */
  createShadowDOM(wrapper, progressWrapper, options = {}) {
    const { buttonSize = 14, opacity = 0.3, speed = '1.0', volume = '1.0' } = options;

    const { top = '0px', left = '0px' } = this.calculatePosition();

    this.shadow = wrapper.attachShadow({ mode: 'open' });
    this.progressShadow = progressWrapper.attachShadow({ mode: 'open' });

    // Create style element with embedded CSS
    const style = document.createElement('style');
    style.textContent = this.cssText;
    this.shadow.appendChild(style);

    const progressStyle = document.createElement('style');
    progressStyle.textContent = this.cssText;
    this.progressShadow.appendChild(progressStyle);

    // Create controller div
    this.controllerDiv = document.createElement('div');
    this.controllerDiv.id = 'controller';
    this.controllerDiv.style.setProperty('--top', top);
    this.controllerDiv.style.setProperty('--left', left);
    this.controllerDiv.style.setProperty('--opacity', opacity);
    this.shadow.appendChild(this.controllerDiv);

    this.progressContainerDiv = document.createElement('div');
    this.progressContainerDiv.id = 'vsc-progress-container';
    this.progressContainerDiv.style.setProperty('--top', top);
    this.progressContainerDiv.style.setProperty('--left', left);
    this.progressContainerDiv.style.setProperty('--opacity', opacity);
    this.progressShadow.appendChild(this.progressContainerDiv);
    // const topDiv = document.createElement('div');
    // topDiv.style.display = 'inline-block';
    // this.controllerDiv.appendChild(topDiv);

    // Create draggable speed indicator
    const draggable = document.createElement('span');
    draggable.setAttribute('data-action', 'drag');
    draggable.className = 'draggable';
    draggable.style.cssText = `font-size: ${buttonSize}px;`;
    this.controllerDiv.appendChild(draggable);
    // topDiv.appendChild(draggable);

    this.progressLineContainer = document.createElement('div');
    this.progressLineContainer.setAttribute('id', 'vsc-progress-lines');
    this.progressContainerDiv.appendChild(this.progressLineContainer);

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
    this.volumeIndicator.textContent = `(vol: ${(volume * 100).toFixed(0)})`;

    this.progressText = document.createElement('div');
    this.progressText.id = 'vsc-progress-val';
    this.progressText.setAttribute('data-action', 'drag');
    this.progressText.textContent = '...';

    draggable.appendChild(this.speedIndicator);
    draggable.appendChild(document.createTextNode(' '));
    draggable.appendChild(this.volumeIndicator);

    this.progressContainerDiv.appendChild(this.progressText);

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
   * Calculate position for controller based on video element
   * @param {HTMLVideoElement} video - Video element
   * @returns {Object} Position object with top and left properties
   */
  calculatePosition() {
    const rect = this.target.getBoundingClientRect();

    // getBoundingClientRect is relative to the viewport; style coordinates
    // are relative to offsetParent, so we adjust for that here. offsetParent
    // can be null if the video has `display: none` or is not yet in the DOM.
    const offsetRect = this.target.offsetParent?.getBoundingClientRect();
    const top = `${Math.max(rect.top - (offsetRect?.top || 0), 0)}px`;
    const left = `${Math.max(rect.left - (offsetRect?.left || 0), 0)}px`;

    return { top, left };
  }

  /**
   * Adjusts the location of the controller based on the video element's position
   */
  adjustLocation() {
    if (!this.controllerDiv) {
      return;
    }

    const { left, top } = this.calculatePosition();

    this.controllerDiv.style.left = left;
    this.controllerDiv.style.top = top;
  }
}

// Create singleton instance
window.VSC.ShadowDOMManager = ShadowDOMManager;
