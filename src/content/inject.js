/**
 * Video Speed Controller - Main Content Script.
 * Bootstraps the extension and bridges popup/background messages to it.
 */
import { config } from '../core/config.js';
import { stateManager } from '../core/state-manager.js';
import { MESSAGE_TYPES } from '../shared/constants.js';
import { logger } from '../utils/logger.js';
import { VideoSpeedExtension } from './video-speed-extension.js';

// Initialize extension and message handlers in an IIFE to avoid global scope pollution
(function () {
  // Create and initialize extension instance
  const extension = new VideoSpeedExtension();

  // Lifecycle commands from bridge (popup, background, storage changes)
  document.documentElement.addEventListener('VSC_MESSAGE', (event) => {
    const message = event.detail;

    if (typeof message !== 'object' || !message.type || !message.type.startsWith('VSC_')) {
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

      case MESSAGE_TYPES.SET_SPEED:
        if (typeof message.payload?.speed === 'number') {
          extension.actionHandler.runAction({
            actionItem: { action: { name: 'SET_SPEED' }, value: message.payload.speed },
          });
        }
        break;

      case MESSAGE_TYPES.ADJUST_SPEED:
        if (typeof message.payload?.delta === 'number') {
          extension.actionHandler.runAction({
            actionItem: { action: { name: 'ADJUST_SPEED' }, value: message.payload.delta },
          });
        }
        break;

      case MESSAGE_TYPES.RESET_SPEED:
        extension.actionHandler.runAction({ actionItem: { action: { name: 'RESET_SPEED' } } });
        break;

      case MESSAGE_TYPES.RUN_ACTION:
        if (message.payload?.action) {
          const binding = config.getActionByName(message.payload.action);
          extension.actionHandler.runAction({ actionItem: binding ?? message.payload.action });
        }
        break;

      case MESSAGE_TYPES.TOGGLE_DISPLAY:
        extension.actionHandler.runAction({ actionItem: 'display' });
        break;

      case MESSAGE_TYPES.TEARDOWN:
        extension.teardown();
        break;

      case MESSAGE_TYPES.REINIT:
        extension.initialize();
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
