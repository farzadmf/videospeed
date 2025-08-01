/**
 * DOM utility functions for Video Speed Controller
 * Modular architecture using global variables
 */

window.VSC = window.VSC || {};
window.VSC.DomUtils = {};

import { logger } from '../utils/logger.js';
import { REG_STRIP, REG_ENDS_WITH_FLAGS } from '../shared/constants.js';

/**
 * Escape string for use in regular expressions
 * @param {string} str - String to escape
 * @returns {string} Escaped string
 */
export function escapeStringRegExp(str) {
  const matchOperatorsRe = /[|\\{}()[\]^$+*?.]/g;
  return str.replace(matchOperatorsRe, '\\$&');
}
window.VSC.DomUtils.escapeStringRegExp = escapeStringRegExp;

/**
 * Check if current page is blacklisted
 * @param {string} blacklist - Blacklist string from settings
 * @returns {boolean} True if page is blacklisted
 */
export function isBlacklisted(blacklist) {
  let blacklisted = false;

  blacklist.forEach((match) => {
    match = match.replace(REG_STRIP, '');
    if (match.length === 0) {
      return;
    }

    let regexp;
    if (match.startsWith('/')) {
      try {
        const parts = match.split('/');
        if (parts.length < 3) {
          return;
        }

        const hasFlags = REG_ENDS_WITH_FLAGS.test(match);
        const flags = hasFlags ? parts.pop() : '';
        const regex = parts.slice(1, hasFlags ? undefined : -1).join('/');

        if (!regex) {
          return;
        }
        regexp = new RegExp(regex, flags);
      } catch {
        return;
      }
    } else {
      // For plain strings, check if it looks like a domain pattern
      const escapedMatch = window.VSC.DomUtils.escapeStringRegExp(match);

      // Check if the pattern looks like a domain (contains dots but no slashes)
      const looksLikeDomain = match.includes('.') && !match.includes('/');

      if (looksLikeDomain) {
        // Create a regex that matches the domain more precisely
        // This will match:
        // - After protocol (e.g., https://x.com)
        // - As part of the URL structure (e.g., https://www.x.com)
        // - But NOT partial matches (e.g., x.com does NOT match netflix.com)
        // The pattern ensures domain boundaries are respected
        regexp = new RegExp(`(^|\\.|//)${escapedMatch}(\\/|:|$)`);
      } else {
        // For non-domain patterns, keep the original behavior
        regexp = new RegExp(escapedMatch);
      }
    }

    if (regexp.test(location.hostname)) {
      blacklisted = true;
    }
  });

  return blacklisted;
}
window.VSC.DomUtils.isBlacklisted = isBlacklisted;

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

  window.onload = () => {
    callback(window.document);
  };

  if (document) {
    if (document.readyState === 'complete') {
      callback(document);
    } else {
      document.onreadystatechange = () => {
        if (document.readyState === 'complete') {
          callback(document);
        }
      };
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
