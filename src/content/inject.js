/**
 * Video Speed Controller - Main Content Script
 * Modular architecture using global variables loaded via script array
 */

import { VideoController } from '../core/video-controller.js';
import { logger } from '../utils/logger.js';
import { config } from '../core/config.js';

class VideoSpeedExtension {
  constructor() {
    this.config = null;
    this.actionHandler = null;
    this.eventManager = null;
    this.mutationObserver = null;
    this.mediaObserver = null;
    this.shadowHostObserver = null;
    this.initialized = false;
    this.config = config;
  }

  /**
   * Initialize the extension
   */
  async initialize() {
    try {
      // Access global modules
      this.ActionHandler = window.VSC.ActionHandler;
      this.EventManager = window.VSC.EventManager;
      this.isBlacklisted = window.VSC.DomUtils.isBlacklisted;
      this.initializeWhenReady = window.VSC.DomUtils.initializeWhenReady;
      this.siteHandlerManager = window.VSC.siteHandlerManager;
      this.VideoMutationObserver = window.VSC.VideoMutationObserver;
      this.MediaElementObserver = window.VSC.MediaElementObserver;
      this.MESSAGE_TYPES = window.VSC.Constants.MESSAGE_TYPES;

      logger.info('Video Speed Controller starting...');

      // Load configuration
      await this.config.load();

      // Check if extension is enabled
      if (!this.config.settings.enabled) {
        logger.info('Extension is disabled');
        return;
      }

      // Check if site is blacklisted
      if (this.isBlacklisted(this.config.settings.blacklist)) {
        logger.info('Site is blacklisted');
        return;
      }

      // Initialize site handler
      this.siteHandlerManager.initialize(document);

      // Create action handler and event manager
      this.eventManager = new this.EventManager(this.config, null);
      this.actionHandler = new this.ActionHandler(this.config, this.eventManager);
      this.eventManager.actionHandler = this.actionHandler; // Set circular reference

      // Set up observers
      this.setupObservers();

      // Initialize when document is ready
      this.initializeWhenReady(document, (doc) => {
        this.initializeDocument(doc);
      });

      logger.info('Video Speed Controller initialized successfully');
      this.initialized = true;
    } catch (error) {
      logger.error(`❌ Failed to initialize Video Speed Controller: ${error.message}`);
      logger.error('📋 Full error details:', error);
      logger.error('🔍 Error stack:', error.stack);
    }
  }

  /**
   * Initialize for a specific document
   * @param {Document} document - Document to initialize
   */
  initializeDocument(document) {
    try {
      // Prevent double initialization
      if (document.body && document.body.classList.contains('vsc-initialized')) {
        return;
      }

      if (document.body) {
        document.body.classList.add('vsc-initialized');
        logger.debug('vsc-initialized added to document body');
      }

      // Set up event listeners
      this.eventManager.setupEventListeners(document);

      // Site-specific script injection is now handled by content script (injector.js)

      // Set up CSS for non-main documents
      if (document !== window.document) {
        this.setupDocumentCSS(document);
      }

      // Start mutation observer
      if (this.mutationObserver) {
        this.mutationObserver.start(document);
      }

      // Start the shadow host observer
      if (this.shadowHostObserver) {
        this.shadowHostObserver.observe(document, { childList: true, subtree: true });
      }

      // Scan for existing media elements
      this.scanExistingMedia(document);

      // Initialize any iframes
      const iframes = document.getElementsByTagName('iframe');
      for (const iframe of iframes) {
        try {
          const iframeDocument = iframe.contentDocument;
          if (iframeDocument) {
            this.initializeWhenReady(iframeDocument, (doc) => this.scanExistingMedia(doc));
          }
        } catch (e) {
          logger.warn(`Could not access iframe content: ${e.message}`);
        }
      }

      logger.debug('Document initialization completed');
    } catch (error) {
      logger.error(`Failed to initialize document: ${error.message}`);
    }
  }

  /**
   * Set up observers for DOM changes and video detection
   */
  setupObservers() {
    // Media element observer
    this.mediaObserver = new this.MediaElementObserver(this.config, this.siteHandlerManager);

    // Mutation observer for dynamic content
    this.mutationObserver = new this.VideoMutationObserver(
      this.config,
      (video, parent) => this.onVideoFound(video, parent),
      (video) => this.onVideoRemoved(video)
    );

    this.shadowHostObserver = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node.shadowRoot) {
            this.scanExistingMedia(node.shadowRoot);
          }
        }
      }
    });
  }

  /**
   * Handle newly found video element
   * @param {HTMLMediaElement & { vsc?: VideoController }} video - Video element
   * @param {HTMLElement} parent - Parent element
   */
  onVideoFound(video, parent) {
    try {
      if (!this.mediaObserver.isValidMediaElement(video)) {
        logger.debug('Video element is not valid for controller attachment');
        return;
      }

      if (video.vsc) {
        logger.debug('Video already has controller attached');
        return;
      }

      logger.debug('Attaching controller to new video element');
      video.vsc = new VideoController(video, parent, this.config, this.actionHandler);
    } catch (error) {
      logger.error('💥 Failed to attach controller to video:', error);
      logger.error(`Failed to attach controller to video: ${error.message}`);
    }
  }

  /**
   * Handle removed video element
   * @param {HTMLMediaElement & { vsc?: VideoController }} video - Video element
   */
  onVideoRemoved(video) {
    try {
      if (video.vsc) {
        logger.debug('Removing controller from video element');
        video.vsc.remove();
      }
    } catch (error) {
      logger.error(`Failed to remove video controller: ${error.message}`);
    }
  }

  /**
   * Scan for existing media elements in document
   * @param {Document} document - Document to scan
   */
  scanExistingMedia(document) {
    try {
      const mediaElements = [];
      const mediaTagSelector = this.config.settings.audioBoolean ? 'video,audio' : 'video';

      const findMediaRecursively = (rootNode) => {
        const mediaInNode = rootNode.querySelectorAll(mediaTagSelector);
        mediaInNode.forEach((media) => mediaElements.push(media));

        const allChildren = rootNode.querySelectorAll('*');
        allChildren.forEach((child) => {
          if (child.shadowRoot) {
            findMediaRecursively(child.shadowRoot);
          }
        });
      };

      findMediaRecursively(document);

      const uniqueMediaElements = [...new Set(mediaElements)];

      uniqueMediaElements.forEach((media) => {
        this.onVideoFound(media, media.parentElement);
      });

      logger.info(`Attached controllers to ${uniqueMediaElements.length} existing media elements`);
    } catch (error) {
      logger.error(`Failed to scan existing media: ${error.message}`);
    }
  }

  /**
   * Set up CSS for iframe documents
   * @param {Document} document - Document to set up CSS for
   */
  setupDocumentCSS(document) {
    const link = document.createElement('link');
    link.href =
      typeof chrome !== 'undefined' && chrome.runtime
        ? chrome.runtime.getURL('src/styles/inject.css')
        : '/src/styles/inject.css';
    link.type = 'text/css';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
    logger.debug('CSS injected into iframe document');
  }

  /**
   * Clean up resources
   */
  cleanup() {
    try {
      if (this.mutationObserver) {
        this.mutationObserver.stop();
      }

      if (this.shadowHostObserver) {
        this.shadowHostObserver.disconnect();
      }

      if (this.eventManager) {
        this.eventManager.cleanup();
      }

      this.siteHandlerManager.cleanup();

      // Clean up all video controllers
      this.config.getMediaElements().forEach((video) => {
        if (video.vsc) {
          video.vsc.remove();
        }
      });

      this.initialized = false;
      logger.info('Video Speed Controller cleaned up');
    } catch (error) {
      logger.error(`Failed to cleanup: ${error.message}`);
    }
  }
}

// Message handler for popup communication via bridge
// Listen for messages from content script bridge
window.addEventListener('VSC_MESSAGE', (event) => {
  const message = event.detail;

  // Handle namespaced VSC message types
  if (typeof message === 'object' && message.type && message.type.startsWith('VSC_')) {
    const videos = document.querySelectorAll('video');

    switch (message.type) {
      case window.VSC.Constants.MESSAGE_TYPES.SET_SPEED:
        if (message.payload && typeof message.payload.speed === 'number') {
          const targetSpeed = message.payload.speed;
          videos.forEach((video) => {
            if (video.vsc) {
              extension.actionHandler.setSpeed(video, targetSpeed);
            } else {
              video.playbackRate = targetSpeed;
            }
          });
        }
        break;

      case window.VSC.Constants.MESSAGE_TYPES.ADJUST_SPEED:
        if (message.payload && typeof message.payload.delta === 'number') {
          const delta = message.payload.delta;
          videos.forEach((video) => {
            const newSpeed = Math.min(Math.max(video.playbackRate + delta, 0.07), 16);
            if (video.vsc) {
              extension.actionHandler.setSpeed(video, newSpeed);
            } else {
              video.playbackRate = newSpeed;
            }
          });
        }
        break;

      case window.VSC.Constants.MESSAGE_TYPES.RESET_SPEED:
        videos.forEach((video) => {
          if (video.vsc) {
            extension.actionHandler.resetSpeed(video, 1.0);
          } else {
            video.playbackRate = 1.0;
          }
        });
        break;

      case window.VSC.Constants.MESSAGE_TYPES.TOGGLE_DISPLAY:
        if (extension.actionHandler) {
          extension.actionHandler.runAction({ actionItem: 'display' });
        }
        break;
    }
  }
});

// Create and initialize extension instance
const extension = new VideoSpeedExtension();

// Handle page unload
window.addEventListener('beforeunload', () => {
  extension.cleanup();
});

// Auto-initialize - settings loading will wait for injected settings if needed
extension.initialize().catch((error) => {
  logger.error(`Extension initialization failed: ${error.message}`);
  window.VSC.logger.error(`Extension initialization failed: ${error.message}`);
});

// Export for testing
window.VideoSpeedExtension = VideoSpeedExtension;
window.videoSpeedExtension = extension;

// Add test indicator for E2E tests
const testIndicator = document.createElement('div');
testIndicator.id = 'vsc-test-indicator';
testIndicator.style.display = 'none';
document.head.appendChild(testIndicator);
