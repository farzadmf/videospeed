/**
 * Custom element for the video speed controller
 * Uses Web Components to avoid CSS conflicts with page styles
 */

import { logger } from '../utils/logger.js';

window.VSC = window.VSC || {};

export class VSCControllerElement extends HTMLElement {
  constructor() {
    super();
  }

  connectedCallback() {
    logger.debug('VSC custom element connected to DOM');
  }

  disconnectedCallback() {
    // Cleanup when element is removed
    logger.debug('VSC custom element disconnected from DOM');
  }

  static register() {
    // Define the custom element if not already defined
    if (!customElements.get('vsc-controller')) {
      customElements.define('vsc-controller', VSCControllerElement);
      logger.info('VSC custom element registered');
    }
  }
}

// Export the class
window.VSC.VSCControllerElement = VSCControllerElement;

// Auto-register when the script loads
VSCControllerElement.register();
