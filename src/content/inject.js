/**
 * Video Speed Controller - Main Content Script.
 * Bootstraps the extension and bridges popup/background messages to it.
 */
import { installPlaceRelay } from '../coordination/frame-place.js';
import { installRevealRelay } from '../coordination/reveal.js';
import { stateManager } from '../core/state-manager.js';
import { MESSAGE_TYPES } from '../shared/constants.js';
import { logger } from '../utils/logger.js';
import { VideoSpeedExtension } from './video-speed-extension.js';

// Initialize extension and message handlers in an IIFE to avoid global scope pollution
(function () {
  // Create and initialize extension instance
  const extension = new VideoSpeedExtension();

  // Before initialize(), which returns early in frames the top frame scans: such a frame
  // can still sit between a video's frame and the top, and must pass requests on.
  installPlaceRelay();
  installRevealRelay();

  // Lifecycle commands from bridge (popup, background, storage changes)
  document.documentElement.addEventListener('VSC_MESSAGE', (event) => {
    const message = event.detail;

    if (!message || typeof message !== 'object' || !message.type || !message.type.startsWith('VSC_')) {
      return;
    }

    switch (message.type) {
      case MESSAGE_TYPES.STATUS:
        document.documentElement.dispatchEvent(
          new CustomEvent('VSC_STATUS_REPLY', {
            detail: {
              abort: !!extension.config?.settings?._abort,
              controllerCount:
                extension.frameCoordinator?.totalControllerCount() ?? stateManager.getAllMediaElements().length,
              initialized: extension.initialized,
            },
          })
        );
        break;

      case MESSAGE_TYPES.INVENTORY_COMMAND:
        extension.runCommand(message);
        break;

      case MESSAGE_TYPES.INVENTORY_START:
        extension.startInventory();
        break;

      case MESSAGE_TYPES.INVENTORY_STOP:
        extension.stopInventory();
        break;

      case MESSAGE_TYPES.TEARDOWN:
        extension.teardown();
        break;
    }
  });

  // Prevent double injection
  if (window.VSC_controller && window.VSC_controller.initialized) {
    logger.info('VSC already initialized, skipping re-injection');
    return;
  }

  // Auto-initialize
  extension.initialize().catch((error) => {
    logger.error(`Extension initialization failed: ${error.message}`);
  });

  // Export only what's needed with consistent VSC_ prefix
  window.VSC_controller = extension; // The initialized instance
})();
