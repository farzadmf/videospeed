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
import { MESSAGE_TYPES, SPEED_LIMITS } from '../shared/constants.js';
import { MediaElementObserver } from '../observers/media-observer.js';
import { SiteHandlerManager } from '../site-handlers/manager.js';
import { stateManager } from '../core/state-manager.js';

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
      // Skip about:blank frames — the bridge doesn't run there,
      // so VSC_REQUEST_SETTINGS would always time out.
      if (location.href === 'about:blank') {
        return;
      }

      // Skip same-origin iframes — the top frame's media observer already
      // scans them, and the bridge may not have been injected (dynamically
      // created iframes miss document_start content scripts).
      if (window !== window.top) {
        try {
          // Accessing cross-origin window.top.document throws — same-origin won't
          if (window.top.document) {
            return;
          }
        } catch {
          // Cross-origin iframe — needs its own initialization
        }
      }

      // Access global modules
      this.siteHandlerManager = new SiteHandlerManager(this.config.settings);
      this.MediaElementObserver = MediaElementObserver;
      this.MESSAGE_TYPES = MESSAGE_TYPES;

      logger.info('Video Speed Controller starting...');

      await this.config.load();

      if (this.config.settings._abort) {
        logger.debug('Extension disabled on this site — aborting init');
        return;
      }

      // Defer DOM work so the page's framework (e.g. YouTube's Polymer)
      // finishes init before we touch anything.
      this.deferDOMWork(document);
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
      // MyNote: probably the only place that using window.VSC is "fine"!
      if (window.VSC.initialized) {
        return;
      }

      window.VSC.initialized = true;

      // MyNote: upstream replaced applyDomainStyles (which mutated <html> style) with
      // preprocessDomainCSS() that does string replacement at injection time. We don't
      // need either — our inject_new.css has no --vsc-domain rules, and the manifest
      // already injects inject_new.css into all frames (all_frames: true).
      this.eventManager.setupEventListeners(document);

      this.deferExpensiveOperations(document);
      logger.debug('Document initialization completed');
    } catch (error) {
      logger.error(`Failed to initialize document: ${error.message}`);
    }
  }

  /**
   * Defer DOM work via requestIdleCallback to yield to site frameworks
   * before injecting CSS, controllers, and observers.
   */
  deferDOMWork(document) {
    const doWork = () => {
      // MyNote: upstream injects controller CSS via adoptedStyleSheets here —
      // two separate sheets: _controllerSheet (built-in defaults, domain-
      // preprocessed, never changes at runtime) and _customSheet (user
      // additions from customCSS setting, injected raw, live-updatable).
      // (injectControllerCSS + setupCSSLiveUpdates). We use <link> tags via
      // manifest content_scripts.css, so no CSS injection needed.

      this.siteHandlerManager.initialize(document);

      this.eventManager = new EventManager(this.config, null);
      this.actionHandler = new ActionHandler({
        config: this.config,
        eventManager: this.eventManager,
        siteHandlerManager: this.siteHandlerManager,
      });
      this.eventManager.actionHandler = this.actionHandler;

      this.setupObservers();

      dom.initializeWhenReady(document, (doc) => {
        this.initializeDocument(doc);
      });

      logger.info('Video Speed Controller initialized successfully');
      this.initialized = true;
    };

    if (window.requestIdleCallback) {
      requestIdleCallback(doWork);
    } else {
      setTimeout(doWork, 0);
    }
  }

  /**
   * Defer expensive operations to avoid blocking page load
   * @param {Document} document - Document to defer operations for
   */
  deferExpensiveOperations(document) {
    const callback = () => {
      try {
        // Start mutation observer — catches dynamically added media elements
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

    if (window.requestIdleCallback) {
      requestIdleCallback(callback);
    } else {
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

    if (window.requestIdleCallback) {
      requestIdleCallback(performChunkedScan);
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

        logger.info(`Comprehensive scan found ${comprehensiveMedia.length} additional media elements`);
      } catch (error) {
        logger.error(`Failed comprehensive media scan: ${error.message}`);
      }
    }, 300); // Wait 300ms before comprehensive scan
  }

  /**
   * Resolve domain-based CSS selectors for the current hostname.
   * Matching domains: selector stripped (rule applies). Non-matching: [data-vsc-never].
   *
   * MyNote: upstream uses this to preprocess inline <style> CSS text at injection time,
   * avoiding <html> style mutation. We inject CSS via <link> tags so we can't preprocess,
   * and our inject_new.css has no --vsc-domain rules, so this is not needed.
   */
  // preprocessDomainCSS(css) {
  //   const hostname = location.hostname.replace(/^www\./, '');
  //   return css.replace(/\[style\*='--vsc-domain:\s*"([^"]+)"'\]/g, (_match, domain) =>
  //     domain === hostname ? '' : '[data-vsc-never]'
  //   );
  // }

  // MyNote: removed — mutating <html> style triggers framework MutationObservers.
  // Upstream replaced this with preprocessDomainCSS() above.
  // applyDomainStyles(document) {
  //   try {
  //     const hostname = window.location.hostname;
  //     if (document.documentElement) {
  //       document.documentElement.style.setProperty('--vsc-domain', `"${hostname}"`);
  //     }
  //   } catch (error) {
  //     logger.error(`Failed to apply domain styles: ${error.message}`);
  //   }
  // }

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
   * Tear down the extension: remove all controllers, stop observers, clean up listeners.
   * Counterpart to initialize() — leaves the page as if VSC was never active.
   */
  teardown() {
    if (!this.initialized) {
      return;
    }

    logger.info('Tearing down Video Speed Controller');

    const videos = stateManager ? stateManager.getAllMediaElements() : [];
    for (const video of videos) {
      if (video.vsc) {
        video.vsc.remove();
      }
    }

    if (this.mutationObserver) {
      this.mutationObserver.stop();
      this.mutationObserver = null;
    }

    if (this.eventManager) {
      this.eventManager.cleanup();
      this.eventManager = null;
    }

    if (this.siteHandlerManager) {
      this.siteHandlerManager.cleanup();
    }

    this.actionHandler = null;
    this.mediaObserver = null;
    this.initialized = false;
    window.VSC.initialized = false;
  }

  /**
   * Handle newly found video element
   * @param {HTMLMediaElement & { vsc?: VideoController }} video - Video element
   * @param {HTMLElement} parent - Parent element
   */
  onVideoFound(video, parent) {
    logger.verbose('[onVideoFound] start', 'video', video, 'parent', parent);

    try {
      if (!this.mediaObserver.isValidMediaElement(video)) {
        logger.verbose('[onVideoFound] Video element is not valid for controller attachment');
        return;
      }

      if (video.vsc) {
        logger.verbose('[onVideoFound] Video already has controller attached');
        return;
      }

      if (!video.src && !video.currentSrc) {
        logger.verbose('[onVideoFound] Video has no source; not attaching a controller');
        return;
      }

      // Defer controller creation until the video has enough data.
      // Inserting <vsc-controller> into a player container while the site's
      // framework is still initializing can trigger internal MutationObservers.
      // readyState >= 2 (HAVE_CURRENT_DATA) signals the player has settled.
      if (video.readyState < 2 && (video.src || video.currentSrc)) {
        logger.debug('[onVideoFound] Deferring controller until loadeddata (readyState=%d)', video.readyState);
        video.addEventListener('loadeddata', () => this.onVideoFound(video, parent), {
          once: true,
        });
        return;
      }

      // Check if controller should start hidden based on video visibility/size
      const shouldStartHidden = this.mediaObserver?.shouldStartHidden(video) || false;

      logger.debug(
        '[onVideoFound] Attaching controller to new video element',
        shouldStartHidden ? '(starting hidden)' : '',
        video
      );

      video.vsc = new VideoController({
        actionHandler: this.actionHandler,
        config: this.config,
        parent,
        shouldStartHidden,
        target: video,
        siteHandlerManager: this.siteHandlerManager,
      });
    } catch (error) {
      logger.error('[onVideoFound] 💥 Failed to attach controller to video:', error);
      logger.error(`[onVideoFound] Failed to attach controller to video: ${error.message}`);
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

  // MyNote: removed — our manifest injects inject_new.css into all frames
  // (all_frames: true), so manual iframe CSS injection is redundant.
  // setupDocumentCSS(document) {
  //   const link = document.createElement('link');
  //   link.href =
  //     typeof chrome !== 'undefined' && chrome.runtime ? chrome.runtime.getURL('src/styles/inject.css') : '/src/styles/inject.css';
  //   link.type = 'text/css';
  //   link.rel = 'stylesheet';
  //   document.head.appendChild(link);
  //   logger.debug('CSS injected into iframe document');
  // }
}

// Initialize extension and message handlers in an IIFE to avoid global scope pollution
(function () {
  // Create and initialize extension instance
  const extension = new VideoSpeedExtension();

  // Lifecycle commands from bridge (popup, background, storage changes)
  document.documentElement.addEventListener('VSC_MESSAGE', (event) => {
    const message = event.detail;

    // Handle namespaced VSC message types
    if (typeof message === 'object' && message.type && message.type.startsWith('VSC_')) {
      // Use state manager for complete media element discovery (includes shadow DOM)
      const videos = stateManager ? stateManager.getAllMediaElements() : [];

      switch (message.type) {
        case MESSAGE_TYPES.SET_SPEED:
          if (message.payload && typeof message.payload.speed === 'number') {
            const targetSpeed = Math.min(Math.max(message.payload.speed, SPEED_LIMITS.MIN), SPEED_LIMITS.MAX);
            videos.forEach((video) => {
              if (video.vsc) {
                extension.actionHandler.adjustSpeed(video, targetSpeed);
              } else {
                video.playbackRate = targetSpeed;
              }
            });

            // Log the successful operation
            logger.debug(`Set speed to ${targetSpeed} on ${videos.length} media elements`);
          }
          break;

        case MESSAGE_TYPES.ADJUST_SPEED:
          if (message.payload && typeof message.payload.delta === 'number') {
            const delta = message.payload.delta;
            videos.forEach((video) => {
              if (video.vsc) {
                extension.actionHandler.adjustSpeed(video, delta, { relative: true });
              } else {
                // Fallback for videos without controller
                const newSpeed = Math.min(Math.max(video.playbackRate + delta, SPEED_LIMITS.MIN), SPEED_LIMITS.MAX);
                video.playbackRate = newSpeed;
              }
            });

            logger.debug(`Adjusted speed by ${delta} on ${videos.length} media elements`);
          }
          break;

        case MESSAGE_TYPES.RESET_SPEED:
          videos.forEach((video) => {
            if (video.vsc) {
              extension.actionHandler.resetSpeed(video, 1.0);
            } else {
              video.playbackRate = 1.0;
            }
          });

          logger.debug(`Reset speed on ${videos.length} media elements`);
          break;

        case MESSAGE_TYPES.TOGGLE_DISPLAY:
          if (extension.actionHandler) {
            extension.actionHandler.runAction('display', null, null);
          }
          break;

        case MESSAGE_TYPES.TEARDOWN:
          extension.teardown();
          break;

        case MESSAGE_TYPES.REINIT:
          extension.initialize();
          break;
      }
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
