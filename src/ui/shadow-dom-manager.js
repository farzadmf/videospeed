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
  }

  /**
   * Returns the CSS style text for the shadow DOM
   * @returns {string} CSS style text
   */
  static getCssStyleText() {
    return `
      * {
        box-sizing: border-box;
        font-family: sans-serif;
        font-size: 13px;
        line-height: 1.4em;
      }

      :host(:hover) #controls {
        display: inline-block;
      }

      #controller {
        background: black;
        border-radius: 6px;
        color: white;
        cursor: default;
        left: 0;
        margin: 10px 10px 10px 15px;
        padding: 4px;
        position: absolute;
        top: 0;
        white-space: nowrap;
        z-index: 9999999;
      }

      #controller:hover {
        opacity: 0.7;
      }

      #controller:hover>.draggable {
        margin-right: 0.8em;
      }

      #controls {
        display: none;
        vertical-align: middle;
      }

      #controller.dragging {
        cursor: -webkit-grabbing;
        opacity: 0.7;
      }

      #controller.dragging #controls {
        display: inline-block;
      }

      .draggable {
        box-sizing: border-box;
        cursor: -webkit-grab;
        text-align: center;
        vertical-align: middle;
        width: 100%;
      }

      .draggable:active {
        cursor: -webkit-grabbing;
      }

      button {
        background: white;
        border-radius: 5px;
        border: 0px solid white;
        color: black;
        cursor: pointer;
        font-family: "Lucida Console", Monaco, monospace;
        font-size: inherit;
        font-weight: normal;
        line-height: inherit;
        margin: 0px 2px 2px 2px;
        opacity: 1;
        padding: 1px 5px 3px 5px;
        transition: background 0.2s, color 0.2s;
      }

      button:focus {
        outline: 0;
      }

      button:hover {
        background: #2196f3;
        color: #ffffff;
        opacity: 1;
      }

      button:active {
        background: #2196f3;
        color: #ffffff;
        font-weight: bold;
      }

      button.rw {
        opacity: 0.65;
      }

      button.hideButton {
        margin-left: 8px;
        margin-right: 2px;
        opacity: 0.65;
      }
    `;
  }

  /**
   * Create shadow DOM for video controller
   * @param {HTMLElement} wrapper - Wrapper element
   * @param {Object} options - Configuration options
   * @param {number} [options.buttonSize=14] - Size of control buttons in pixels
   * @param {number} [options.opacity=0.3] - Controller opacity (0-1)
   * @param {string} [options.speed='1.0'] - Initial playback speed display value
   * @param {string} [options.volume='1.0'] - Initial volume display value
   */
  createShadowDOM(wrapper, options = {}) {
    const { buttonSize = 14, opacity = 0.3, speed = '1.0', volume = '1.0' } = options;

    const { top = '50px', left = '0px' } = this.calculatePosition();

    this.shadow = wrapper.attachShadow({ mode: 'open' });

    // Create style element with embedded CSS
    const style = document.createElement('style');
    style.textContent = ShadowDOMManager.getCssStyleText();
    this.shadow.appendChild(style);

    // Create controller div
    this.controllerDiv = document.createElement('div');
    this.controllerDiv.id = 'controller';
    this.controllerDiv.style.cssText = `top:${top}; left:${left}; opacity:${opacity};`;

    const topDiv = document.createElement('div');
    topDiv.style.display = 'inline-block';
    this.controllerDiv.appendChild(topDiv);

    // Create draggable speed indicator
    const draggable = document.createElement('span');
    draggable.setAttribute('data-action', 'drag');
    draggable.className = 'draggable';
    draggable.style.cssText = `font-size: ${buttonSize}px;`;
    // this.controllerDiv.appendChild(draggable);
    topDiv.appendChild(draggable);

    this.progressLineContainer = document.createElement('div');
    this.progressLineContainer.setAttribute('id', 'vsc-progress-container');
    this.progressLineContainer.style.display = 'none';
    this.progressLineContainer.style.position = 'relative';
    this.progressLineContainer.style.marginBlockStart = '2px';
    this.progressLineContainer.style.marginBlockEnd = '10px';
    topDiv.appendChild(this.progressLineContainer);

    const progressFull = document.createElement('div');
    progressFull.setAttribute('id', 'vsc-progress-full');
    progressFull.style.position = 'absolute';
    progressFull.style.width = '100%';
    progressFull.style.border = '4px solid white';
    progressFull.style.borderRadius = '10px';

    this.progressLine = document.createElement('div');
    this.progressLine.setAttribute('id', 'vsc-progress-line');
    this.progressLine.style.position = 'absolute';
    this.progressLine.style.width = '0%';
    this.progressLine.style.border = '4px solid red';
    this.progressLine.style.borderRadius = '10px';

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

    this.progressText = document.createElement('span');
    this.progressText.id = 'vsc-progress-val';
    this.progressText.setAttribute('data-action', 'drag');
    this.progressText.textContent = '...';

    draggable.appendChild(this.speedIndicator);
    draggable.appendChild(document.createTextNode(' '));
    draggable.appendChild(this.volumeIndicator);
    draggable.appendChild(document.createTextNode(' - '));
    draggable.appendChild(this.progressText);

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

    this.shadow.appendChild(this.controllerDiv);

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
