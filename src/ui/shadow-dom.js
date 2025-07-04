/**
 * Shadow DOM creation and management
 * Modular architecture using global variables
 */

window.VSC = window.VSC || {};

class ShadowDOMManager {
  /**
   * Create shadow DOM for video controller
   * @param {HTMLElement} wrapper - Wrapper element
   * @param {Object} options - Configuration options
   * @returns {ShadowRoot} Created shadow root
   */
  static createShadowDOM(wrapper, options = {}) {
    const { top = '0px', left = '0px', speed = '1.0', opacity = 0.3, buttonSize = 14 } = options;

    const shadow = wrapper.attachShadow({ mode: 'open' });

    // Create style element with embedded CSS
    const style = document.createElement('style');
    style.textContent = `
      * {
        font-family: sans-serif;
        font-size: 13px;
        line-height: 1.8em;
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
    shadow.appendChild(style);

    // Create controller div
    const controller = document.createElement('div');
    controller.id = 'controller';
    // controller.style.cssText = `top:${top}; left:${left}; opacity:${opacity};`;
    controller.style.cssText = `top:50px; left:${left}; opacity:${opacity};`;

    // Create draggable speed indicator
    const draggable = document.createElement('span');
    draggable.setAttribute('data-action', 'drag');
    draggable.className = 'draggable';
    draggable.style.cssText = `font-size: ${buttonSize}px;`;
    controller.appendChild(draggable);

    const speedIndicator = document.createElement('span');
    speedIndicator.id = 'vsc-speed-val';
    speedIndicator.setAttribute('data-action', 'drag');
    speedIndicator.textContent = `${speed}x`;
    const volumeIndicator = document.createElement('span');
    volumeIndicator.id = 'vsc-volume-val';
    volumeIndicator.setAttribute('data-action', 'drag');
    volumeIndicator.textContent = '(vol: <VOL>)';

    draggable.appendChild(speedIndicator);
    draggable.appendChild(volumeIndicator);

    // Create controls span
    const controls = document.createElement('span');
    controls.id = 'controls';
    controls.style.cssText = `font-size: ${buttonSize}px; line-height: ${buttonSize}px;`;

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

    controller.appendChild(controls);
    shadow.appendChild(controller);

    window.VSC.logger.debug('Shadow DOM created for video controller');
    return shadow;
  }

  /**
   * Get controller element from shadow DOM
   * @param {ShadowRoot} shadow - Shadow root
   * @returns {HTMLElement} Controller element
   */
  static getController(shadow) {
    return shadow.querySelector('#controller');
  }

  /**
   * Get controls container from shadow DOM
   * @param {ShadowRoot} shadow - Shadow root
   * @returns {HTMLElement} Controls element
   */
  static getControls(shadow) {
    return shadow.querySelector('#controls');
  }

  /**
   * Get draggable speed indicator from shadow DOM
   * @param {ShadowRoot} shadow - Shadow root
   * @returns {HTMLElement} Speed indicator element
   */
  static getSpeedIndicator(shadow) {
    return shadow.querySelector('span#vsc-speed-val');
  }

  static getVolumeIndicator(shadow) {
    return shadow.querySelector('span#vsc-volume-val');
  }

  /**
   * Get all buttons from shadow DOM
   * @param {ShadowRoot} shadow - Shadow root
   * @returns {NodeList} Button elements
   */
  static getButtons(shadow) {
    return shadow.querySelectorAll('button');
  }

  /**
   * Update speed display in shadow DOM
   * @param {ShadowRoot} shadow - Shadow root
   * @param {number} speed - New speed value
   */
  static updateSpeedDisplay(shadow, speed) {
    const speedIndicator = this.getSpeedIndicator(shadow);
    if (speedIndicator) {
      speedIndicator.textContent = speed.toFixed(2);
    }
  }

  /**
   * Calculate position for controller based on video element
   * @param {HTMLVideoElement} video - Video element
   * @returns {Object} Position object with top and left properties
   */
  static calculatePosition(video) {
    const rect = video.getBoundingClientRect();

    // getBoundingClientRect is relative to the viewport; style coordinates
    // are relative to offsetParent, so we adjust for that here. offsetParent
    // can be null if the video has `display: none` or is not yet in the DOM.
    const offsetRect = video.offsetParent?.getBoundingClientRect();
    const top = `${Math.max(rect.top - (offsetRect?.top || 0), 0)}px`;
    const left = `${Math.max(rect.left - (offsetRect?.left || 0), 0)}px`;

    return { top, left };
  }
}

// Create singleton instance
window.VSC.ShadowDOMManager = ShadowDOMManager;
