/**
 * Video Speed Controller - main extension class.
 * Owns initialization, media scanning, observers, and teardown.
 */
import { FrameCoordinator } from '../coordination/frame-coordinator.js';
import { revealElement } from '../coordination/reveal.js';
import { ActionHandler } from '../core/action-handler.js';
import { config } from '../core/config.js';
import { MediaInventory, resolveTarget } from '../core/media-inventory.js';
import { stateManager } from '../core/state-manager.js';
import { VideoController } from '../core/video-controller.js';
import { MediaElementObserver } from '../observers/media-observer.js';
import { VideoMutationObserver } from '../observers/mutation-observer.js';
import { INVENTORY_EVENT, MESSAGE_TYPES } from '../shared/constants.js';
import { SiteHandlerManager } from '../site-handlers/manager.js';
import * as dom from '../utils/dom-utils.js';
import { EventManager } from '../utils/event-manager.js';
import { logger } from '../utils/logger.js';

// Popup commands that carry their own value rather than reading a key binding.
const SPEED_ACTIONS = new Set(['ADJUST_SPEED', 'SET_SPEED']);

// Not an ActionHandler action: it scrolls the page, not the video.
const REVEAL_ACTION = 'reveal';

/**
 * Whether the top frame can walk the DOM down into this frame.
 *
 * Being same-origin with the top frame is not enough: one cross-origin frame
 * anywhere in the ancestor chain stops the traversal, so a frame behind it is
 * reached by nobody and has to scan itself.
 * @returns {boolean}
 */
function isReachableFromTop() {
  let frame = window;

  while (frame !== window.top) {
    try {
      // Throws when this boundary is cross-origin.
      void frame.parent.document;
    } catch {
      return false;
    }
    frame = frame.parent;
  }

  return true;
}

export class VideoSpeedExtension {
  constructor() {
    this.config = null;
    this.actionHandler = null;
    this.eventManager = null;
    this.frameCoordinator = null;
    this.mutationObserver = null;
    this.mediaObserver = null;
    this.mediaInventory = null;
    this.unsubscribeCoordination = null;
    // MyNote: comment out Gemini's shadow observers
    // this.shadowHostObserver = null;
    this.initialized = false;
    // True when this frame left scanning to the top frame, so it owns no controllers.
    this.skipped = false;
    // Cleared by teardown(); queued idle/timeout/loadeddata callbacks check it
    // so a disable that lands mid-startup can't be undone by them.
    this.acceptingMedia = false;
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

      // Skip iframes the top frame can reach — its media observer already scans
      // them, and the bridge may not have been injected (dynamically created
      // iframes miss document_start content scripts).
      if (window !== window.top && isReachableFromTop()) {
        this.skipped = true;
        return;
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

      this.acceptingMedia = true;

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
      if (!this.acceptingMedia) {
        return;
      }

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

      this.setupCoordination();

      this.setupObservers();

      dom.initializeWhenReady(document, (doc) => {
        if (this.acceptingMedia) {
          this.initializeDocument(doc);
        }
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

  /** Report this frame's videos to the popup for as long as its port is open. */
  startInventory() {
    // A frame that left scanning to the top frame owns no controllers, so reporting
    // would add an empty frame and a heartbeat for nothing.
    if (this.skipped) {
      return;
    }

    this.mediaInventory ??= new MediaInventory({
      send: (snapshot) => {
        document.documentElement.dispatchEvent(new CustomEvent(INVENTORY_EVENT, { detail: snapshot }));
      },
    });

    this.mediaInventory.start();
  }

  stopInventory() {
    this.mediaInventory?.stop();
  }

  /**
   * Apply a popup command if it names one of this frame's videos, and report back.
   * @param {Object} command
   * @param {{name: string, value?: number}} command.action
   * @param {number} command.commandId - Echoed back so the popup can match the outcome
   * @param {string} command.target - `<frameToken>:<controllerId>`
   */
  async runCommand({ action, commandId, target }) {
    const resolved = resolveTarget(target);
    if (!resolved.mine || !this.actionHandler) {
      return;
    }

    if (action.name === REVEAL_ACTION) {
      const outcome = resolved.video?.isConnected ? 'applied' : 'unknown-target';
      if (outcome === 'applied') {
        revealElement(resolved.video);
      }

      this.mediaInventory?.sendOutcome({ action, commandId, outcome, target });
      return;
    }

    // Speed actions carry their value; the rest use the user's key binding, which holds
    // settings such as how far rewind and advance seek.
    const actionItem = SPEED_ACTIONS.has(action.name)
      ? { action: { name: action.name }, value: action.value }
      : (this.config.getActionByName(action.name) ?? action.name);

    const outcome = await this.actionHandler.runActionOnVideo({ actionItem, video: resolved.video });
    this.mediaInventory?.sendOutcome({ action, commandId, outcome, target });
  }

  /** Cross-frame coordinator: tracks which frames have controllers. */
  setupCoordination() {
    this.frameCoordinator = new FrameCoordinator({
      getLocalControllerCount: () => stateManager.getAllMediaElements().length,
    });

    this.unsubscribeCoordination = stateManager.subscribeControllersChanged(() =>
      this.frameCoordinator?.announceControllers()
    );

    this.frameCoordinator.start();
  }

  /**
   * Defer expensive operations to avoid blocking page load
   * @param {Document} document - Document to defer operations for
   */
  deferExpensiveOperations(document) {
    const callback = () => {
      try {
        if (!this.acceptingMedia) {
          return;
        }

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
        if (!this.acceptingMedia) {
          return;
        }

        // Use a lighter initial scan - avoid expensive shadow DOM traversal initially
        const lightMedia = this.mediaObserver.scanForMediaLight(document);

        lightMedia.forEach((media) => {
          this.onVideoFound(media, media.parentElement || media.parentNode);
        });

        logger.info(`Attached controllers to ${lightMedia.length} media elements (light scan)`);

        this.scheduleComprehensiveScan(document);
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
   * Watch existing shadow roots and scan for media the light scan cannot reach.
   *
   * Runs regardless of what the light scan found: that scan only queries the document,
   * so a page with both a plain video and one in a shadow root would never scan the second.
   * Observing a shadow root reports its later mutations, not the videos already in it.
   * @param {Document} document - Document to scan comprehensively
   */
  scheduleComprehensiveScan(document) {
    setTimeout(() => {
      try {
        if (!this.acceptingMedia) {
          return;
        }

        this.mutationObserver?.observeExistingShadowRoots(document);

        const comprehensiveMedia = this.mediaObserver.scanAll(document);

        comprehensiveMedia.forEach((media) => {
          // Skip if already has controller
          if (!media.vsc) {
            this.onVideoFound(media, media.parentElement || media.parentNode);
          }
        });

        logger.info(`Comprehensive scan found ${comprehensiveMedia.length} media elements`);
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
    // Before the initialized check: startup may still be queued with nothing
    // to clean up yet.
    this.acceptingMedia = false;

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

    if (this.frameCoordinator) {
      this.frameCoordinator.stop();
      this.frameCoordinator = null;
    }
    this.unsubscribeCoordination?.();
    this.unsubscribeCoordination = null;

    this.mediaInventory?.stop();

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
      // Also reached from the loadeddata wait below, which outlives teardown.
      if (!this.acceptingMedia) {
        return;
      }

      if (!this.mediaObserver.isValidMediaElement(video)) {
        logger.verbose('[onVideoFound] Video element is not valid for controller attachment');
        return;
      }

      if (video.vsc) {
        logger.verbose('[onVideoFound] Video already has controller attached');
        return;
      }

      // Defer controller creation until the video has enough data.
      // Inserting <vsc-controller> into a player container while the site's
      // framework is still initializing can trigger internal MutationObservers.
      // readyState >= 2 (HAVE_CURRENT_DATA) signals the player has settled.
      // UPSTREAM: removed (video.src || video.currentSrc) guard — background tabs
      // create empty <video> before assigning src; injecting into that uninitialized
      // DOM triggers Polymer's wipe-and-reload recovery.
      if (video.readyState < 2) {
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
