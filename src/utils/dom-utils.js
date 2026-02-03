/**
 * DOM utility functions for Video Speed Controller
 */

window.VSC = window.VSC || {};
window.VSC.DomUtils = {};

import { logger } from '../utils/logger.js';

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
