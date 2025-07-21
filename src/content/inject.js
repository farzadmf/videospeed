/**
 * Video Speed Controller - Main Content Script
 * Modular architecture using global variables loaded via script array
 */

import { VideoController } from '../core/video-controller.js';
import { logger } from '../utils/logger.js';
import { config } from '../core/config.js';
import { ActionHandler } from '../core/action-handler.js';
import { EventManager } from '../utils/event-manager.js';
import { VideoMutationObserver } from '../observers/mutation-observer.js';
import * as dom from '../utils/dom-utils.js';

class VideoSpeedExtension {
  constructor() {
    this.config = null;
    this.actionHandler = null;
    this.eventManager = null;
    this.mutationObserver = null;
    this.mediaObserver = null;
    // MyNote: comment out Gemini's shadow observers
    // this.shadowHostObserver = null;
    this.initialized = false;
    this.config = config;
  }

  /**
   * Initialize the extension
   */
  async initialize() {
    try {
      // Access global modules
      this.siteHandlerManager = window.VSC.siteHandlerManager;
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
      if (dom.isBlacklisted(this.config.settings.blacklist)) {
        logger.info('Site is blacklisted');
        return;
      }

      // Initialize site handler
      this.siteHandlerManager.initialize(document);

      // Add domain-specific class to body for CSS targeting
      this.addDomainClass();

      // Create action handler and event manager
      this.eventManager = new EventManager(this.config, null);
      this.actionHandler = new ActionHandler(this.config, this.eventManager);
      this.eventManager.actionHandler = this.actionHandler; // Set circular reference

      // Set up observers
      this.setupObservers();

      // Initialize when document is ready
      dom.initializeWhenReady(document, (doc) => {
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

      // Defer expensive operations to avoid blocking page load
      this.deferExpensiveOperations(document);

      // MyNote: comment out Gemini's shadow observers
      // Start the shadow host observer
      // if (this.shadowHostObserver) {
      //   this.shadowHostObserver.observe(document, { childList: true, subtree: true });
      // }

      // MyNote: comment out Gemini's shadow observers
      //         Function was being called with that code in it.
      // Scan for existing media elements
      // this.scanExistingMedia(document);

      logger.debug('Document initialization completed');
    } catch (error) {
      logger.error(`Failed to initialize document: ${error.message}`);
    }
  }

  /**
   * Defer expensive operations to avoid blocking page load
   * @param {Document} document - Document to defer operations for
   */
  deferExpensiveOperations(document) {
    // Use requestIdleCallback with a longer timeout to avoid blocking critical page load
    const callback = () => {
      try {
        // Start mutation observer after page load is complete
        if (this.mutationObserver) {
          this.mutationObserver.start(document);
          logger.debug('Mutation observer started for document');
        }

        // Defer media scanning to avoid blocking page load
        this.deferredMediaScan(document);
      } catch (error) {
        logger.error(`Failed to complete deferred operations: ${error.message}`);
      }
    };

    // Use requestIdleCallback if available, with reasonable timeout
    if (window.requestIdleCallback) {
      requestIdleCallback(callback, { timeout: 2000 });
    } else {
      // Fallback for browsers without requestIdleCallback
      setTimeout(callback, 100);
    }
  }

  /**
   * Perform media scanning in a non-blocking way
   * @param {Document} document - Document to scan
   */
  deferredMediaScan(document) {
    // Split media scanning into smaller chunks to avoid blocking
    const performChunkedScan = () => {
      try {
        // Use a lighter initial scan - avoid expensive shadow DOM traversal initially
        const lightMedia = this.mediaObserver.scanForMediaLight(document);

        lightMedia.forEach((media) => {
          this.onVideoFound(media, media.parentElement || media.parentNode);
        });

        logger.info(`Attached controllers to ${lightMedia.length} media elements (light scan)`);

        // Schedule comprehensive scan for later if needed
        if (lightMedia.length === 0) {
          this.scheduleComprehensiveScan(document);
        }
      } catch (error) {
        logger.error(`Failed to scan media elements: ${error.message}`);
      }
    };

    // Use requestIdleCallback for the scan as well
    if (window.requestIdleCallback) {
      requestIdleCallback(performChunkedScan, { timeout: 3000 });
    } else {
      setTimeout(performChunkedScan, 200);
    }
  }

  /**
   * Schedule a comprehensive scan if the light scan didn't find anything
   * @param {Document} document - Document to scan comprehensively
   */
  scheduleComprehensiveScan(document) {
    // Only do comprehensive scan if we didn't find any media with light scan
    setTimeout(() => {
      try {
        const comprehensiveMedia = this.mediaObserver.scanAll(document);

        comprehensiveMedia.forEach((media) => {
          // Skip if already has controller
          if (!media.vsc) {
            this.onVideoFound(media, media.parentElement || media.parentNode);
          }
        });

        logger.info(
          `Comprehensive scan found ${comprehensiveMedia.length} additional media elements`
        );
      } catch (error) {
        logger.error(`Failed comprehensive media scan: ${error.message}`);
      }
    }, 300); // Wait 300ms before comprehensive scan
  }

  /**
   * Add domain-specific class to body for CSS targeting
   */
  addDomainClass() {
    try {
      const hostname = window.location.hostname;
      // Convert domain to valid CSS class name
      const domainClass = `vsc-domain-${hostname.replace(/\./g, '-')}`;

      if (document.body) {
        document.body.classList.add(domainClass);
        logger.debug(`Added domain class: ${domainClass}`);
      }
    } catch (error) {
      logger.error(`Failed to add domain class: ${error.message}`);
    }
  }

  /**
   * Set up observers for DOM changes and video detection
   */
  setupObservers() {
    // Media element observer
    this.mediaObserver = new this.MediaElementObserver(this.config, this.siteHandlerManager);

    // Mutation observer for dynamic content
    this.mutationObserver = new VideoMutationObserver(
      this.config,
      (video, parent) => this.onVideoFound(video, parent),
      (video) => this.onVideoRemoved(video),
      this.mediaObserver
    );

    // MyNote: comment out Gemini's shadow observers
    // this.shadowHostObserver = new MutationObserver((mutations) => {
    //   for (const mutation of mutations) {
    //     for (const node of mutation.addedNodes) {
    //       if (node.shadowRoot) {
    //         this.scanExistingMedia(node.shadowRoot);
    //       }
    //     }
    //   }
    // });
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

      // Check if controller should start hidden based on video visibility/size
      const shouldStartHidden = this.mediaObserver?.shouldStartHidden(video) || false;

      logger.debug(
        'Attaching controller to new video element',
        shouldStartHidden ? '(starting hidden)' : ''
      );

      video.vsc = new VideoController(
        video,
        parent,
        this.config,
        this.actionHandler,
        shouldStartHidden
      );
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

  // MyNote: this was completely deprecated and removed from this file, only kept it because it
  //         contains Gemini's shadow observers
  /**
   * Scan for existing media elements in document
   * @param {Document} document - Document to scan
   */
  // scanExistingMedia(document) {
  //   try {
  //     const mediaElements = this.mediaObserver.scanAll(document);
  //
  //     mediaElements.forEach((media) => {
  //       // media.parentElement almost always works. However, if there's a shadow DOM and the
  //       // video is in the root, parentElement is undefined.
  //       this.onVideoFound(media, media.parentElement || media.parentNode);
  //     });
  //
  //     this.logger.info(`Attached controllers to ${mediaElements.length} existing media elements`);
  //   } catch (error) {
  //     this.logger.error(`Failed to scan existing media: ${error.message}`);
  //   }
  //
  //   // MyNote: comment out Gemini's shadow observers
  //   // try {
  //   //   const mediaElements = [];
  //   //   const mediaTagSelector = this.config.settings.audioBoolean ? 'video,audio' : 'video';
  //   //
  //   //   const findMediaRecursively = (rootNode) => {
  //   //     const mediaInNode = rootNode.querySelectorAll(mediaTagSelector);
  //   //     mediaInNode.forEach((media) => mediaElements.push(media));
  //   //
  //   //     const allChildren = rootNode.querySelectorAll('*');
  //   //     allChildren.forEach((child) => {
  //   //       if (child.shadowRoot) {
  //   //         findMediaRecursively(child.shadowRoot);
  //   //       }
  //   //     });
  //   //   };
  //   //
  //   //   findMediaRecursively(document);
  //   //
  //   //   const uniqueMediaElements = [...new Set(mediaElements)];
  //   //
  //   //   uniqueMediaElements.forEach((media) => {
  //   //     this.onVideoFound(media, media.parentElement || media.parentNode);
  //   //   });
  //   //
  //   //   logger.info(`Attached controllers to ${uniqueMediaElements.length} existing media elements`);
  //   // } catch (error) {
  //   //   logger.error(`Failed to scan existing media: ${error.message}`);
  //   // }
  // }

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
      this.mutationObserver?.stop();
      this.eventManager?.cleanup();
      this.siteHandlerManager?.cleanup();

      // MyNote: comment out Gemini's shadow observers
      // if (this.shadowHostObserver) {
      //   this.shadowHostObserver.disconnect();
      // }

      // Clean up all video controllers
      this.config.getMediaElements().forEach((video) => {
        video.vsc?.remove();
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
    const videos = document.querySelectorAll('video, audio');

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
  logger.error(`Extension initialization failed: ${error.message}`);
});

// Export for testing
window.VideoSpeedExtension = VideoSpeedExtension;
window.videoSpeedExtension = extension;

// Add test indicator for E2E tests
const testIndicator = document.createElement('div');
testIndicator.id = 'vsc-test-indicator';
testIndicator.style.display = 'none';
document.head.appendChild(testIndicator);
