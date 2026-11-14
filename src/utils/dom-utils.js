import { logger } from '../utils/logger.js';

/**
 * DOM utility functions for Video Speed Controller
 */

window.VSC = window.VSC || {};
window.VSC.DomUtils = {};

/**
 * Check if we're running in an iframe
 * @returns {boolean} True if in iframe
 */
export function inIframe() {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}
window.VSC.DomUtils.inIframe = inIframe;

/**
 * Check if the target is a text-entry context, where our shortcuts must not fire.
 * @param {EventTarget} target - Event target
 * @returns {boolean} True if typing context
 */
export function isTypingContext(target) {
  return (
    target.nodeName === 'INPUT' ||
    target.nodeName === 'TEXTAREA' ||
    target.isContentEditable ||
    target.nodeName === 'SHREDDIT-COMPOSER'
  );
}
window.VSC.DomUtils.isTypingContext = isTypingContext;

/**
 * Get all elements in shadow DOMs recursively
 * @param {Element} parent - Parent element to search
 * @returns {Array<Element>} Flattened array of all elements
 */
export function getShadow(parent, maxDepth = 10) {
  const result = [];
  const visited = new WeakSet(); // Prevent infinite loops

  function getChild(element, depth = 0) {
    // Prevent infinite recursion and excessive depth
    if (depth > maxDepth || visited.has(element)) {
      return;
    }

    visited.add(element);

    if (element.firstElementChild) {
      let child = element.firstElementChild;
      do {
        result.push(child);
        getChild(child, depth + 1);

        // Only traverse shadow roots if we haven't exceeded depth limit
        if (child.shadowRoot && depth < maxDepth - 2) {
          // Always handle shadow roots synchronously to maintain function contract
          result.push(...getShadow(child.shadowRoot, maxDepth - depth));
        }

        child = child.nextElementSibling;
      } while (child);
    }
  }

  getChild(parent);
  return result.flat(Infinity);
}
window.VSC.DomUtils.getShadow = getShadow;

/**
 * Find nearest parent of same size as video parent
 * @param {Element} element - Starting element
 * @returns {Element} Parent element
 */
export function findVideoParent(element) {
  let parentElement = element.parentElement || element.parentNode;

  while (
    parentElement.parentNode &&
    parentElement.parentNode.offsetHeight === parentElement.offsetHeight &&
    parentElement.parentNode.offsetWidth === parentElement.offsetWidth
  ) {
    parentElement = parentElement.parentNode;
  }

  return parentElement;
}
window.VSC.DomUtils.findVideoParent = findVideoParent;

/**
 * Initialize document when ready
 * @param {Document} document - Document to initialize
 * @param {Function} callback - Callback to run when ready
 */
export function initializeWhenReady(document, callback) {
  logger.debug('Begin initializeWhenReady');

  const handleWindowLoad = () => {
    callback(window.document);
  };

  window.addEventListener('load', handleWindowLoad, { once: true });

  if (document) {
    if (document.readyState === 'complete') {
      callback(document);
    } else {
      const handleReadyStateChange = () => {
        if (document.readyState === 'complete') {
          document.removeEventListener('readystatechange', handleReadyStateChange);
          callback(document);
        }
      };
      document.addEventListener('readystatechange', handleReadyStateChange);
    }
  }

  logger.debug('End initializeWhenReady');
}
window.VSC.DomUtils.initializeWhenReady = initializeWhenReady;

/**
 * Check if element or its children are video/audio elements
 * Recursively searches through nested shadow DOM structures
 * @param {Element} node - Node to check
 * @param {boolean} audioEnabled - Whether to check for audio elements
 * @returns {Array<Element>} Array of media elements found
 */
export function findMediaElements(node, audioEnabled = false) {
  if (!node) {
    return [];
  }

  const mediaElements = [];
  const selector = audioEnabled ? 'video,audio' : 'video';

  // Check the node itself
  if (node && node.matches && node.matches(selector)) {
    mediaElements.push(node);
  }

  // Check children
  if (node.querySelectorAll) {
    mediaElements.push(...Array.from(node.querySelectorAll(selector)));
  }

  // Recursively check shadow roots
  if (node.shadowRoot) {
    mediaElements.push(...findShadowMedia(node.shadowRoot, selector));
  }

  return mediaElements;
}
window.VSC.DomUtils.findMediaElements = findMediaElements;

/**
 * Recursively find media elements in shadow DOM trees
 * @param {ShadowRoot|Document|Element} root - Root to search from
 * @param {string} selector - CSS selector for media elements
 * @returns {Array<Element>} Array of media elements found
 */
export function findShadowMedia(root, selector) {
  const results = [];

  // If root is an element with shadowRoot, search in its shadow first
  if (root.shadowRoot) {
    results.push(...findShadowMedia(root.shadowRoot, selector));
  }

  // Add any matching elements in current root (if it's a shadowRoot/document)
  if (root.querySelectorAll) {
    results.push(...Array.from(root.querySelectorAll(selector)));
  }

  // Recursively check all elements with shadow roots
  if (root.querySelectorAll) {
    const allElements = Array.from(root.querySelectorAll('*'));
    allElements.forEach((element) => {
      if (element.shadowRoot) {
        results.push(...findShadowMedia(element.shadowRoot, selector));
      }
    });
  }

  return results;
}
window.VSC.DomUtils.findShadowMedia = findShadowMedia;

// Global variables available for both browser and testing

/**
 * The chain from an element out to the document: the element, then the host of each
 * shadow root it sits in. The last item is in the document tree.
 * @param {Element} element
 * @returns {Element[]}
 */
function hostChain(element) {
  const chain = [element];

  let root = element.getRootNode();
  while (root instanceof ShadowRoot) {
    chain.push(root.host);
    root = root.host.getRootNode();
  }

  return chain;
}

/**
 * Sort order across shadow roots. compareDocumentPosition alone reports elements in
 * different trees as disconnected, so this compares at the outermost tree where the
 * two chains diverge, where both elements share a root.
 * @returns {number}
 */
export function compareFlatTreeOrder(a, b) {
  const chainA = hostChain(a);
  const chainB = hostChain(b);

  let i = chainA.length - 1;
  let j = chainB.length - 1;
  while (i >= 0 && j >= 0 && chainA[i] === chainB[j]) {
    i -= 1;
    j -= 1;
  }

  if (i < 0 && j < 0) {
    return 0;
  }

  // One element contains the other's shadow tree: the host comes first.
  if (i < 0 || j < 0) {
    return i < 0 ? -1 : 1;
  }

  return chainA[i].compareDocumentPosition(chainB[j]) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
}
