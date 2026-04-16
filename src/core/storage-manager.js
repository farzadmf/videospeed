/**
 * Chrome storage management utilities.
 *
 * Context-aware: uses chrome.storage.sync when available (extension contexts),
 * falls back to CustomEvent bridge with content-bridge.js (MAIN world).
 */

window.VSC = window.VSC || {};

import { logger } from '../utils/logger.js';

const docEl = document.documentElement;

/** True when chrome.storage.sync is available (extension contexts). */
const hasChrome = typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync;

export class StorageManager {
  static errorCallback = null;

  /**
   * Register error callback for monitoring storage failures
   * @param {Function} callback - Callback function for errors
   */
  static onError(callback) {
    this.errorCallback = callback;
  }

  /**
   * Get settings from Chrome storage or bridge
   * @param {Object} defaults - Default values
   * @returns {Promise<Object|null>} Storage data, or null if site is disabled
   */
  static async get(defaults = {}) {
    if (hasChrome) {
      return new Promise((resolve) => {
        chrome.storage.sync.get(defaults, (storage) => {
          logger.debug('StorageManager: settings from chrome.storage');
          resolve(storage);
        });
      });
    }

    // No chrome.storage — request settings from bridge via CustomEvent
    return new Promise((resolve) => {
      const onReady = (e) => {
        docEl.removeEventListener('VSC_SETTINGS_READY', onReady);
        clearTimeout(timeout);
        const detail = e.detail;

        // Structured clone failure: detail is null when crossing worlds
        if (!detail) {
          logger.error('StorageManager: bridge response is null (clone failed?)');
          resolve(defaults);
          return;
        }

        // Bridge signals abort for blacklisted/disabled sites
        if (detail.abort) {
          logger.debug('StorageManager: site disabled by bridge');
          resolve(null);
          return;
        }

        // Store shadow CSS for shadow-dom-manager.js to read
        // NOTE: shadow CSS is now fetched lazily via getShadowCSS()

        // Store sound URL for MAIN world usage (like shadow CSS pattern)
        if (detail.soundBeepUrl) {
          window.VSC._soundBeepUrl = detail.soundBeepUrl;
        }

        logger.debug('StorageManager: settings from bridge');
        resolve({ ...defaults, ...detail.settings });
      };

      const timeout = setTimeout(() => {
        docEl.removeEventListener('VSC_SETTINGS_READY', onReady);
        logger.info('StorageManager: bridge did not respond — aborting');
        resolve(null);
      }, 2000);

      docEl.addEventListener('VSC_SETTINGS_READY', onReady);

      docEl.dispatchEvent(new CustomEvent('VSC_REQUEST_SETTINGS'));
    });
  }

  /**
   * Fetch shadow CSS from the bridge on demand. Caches the result so the
   * fetch only happens once per page — subsequent calls return immediately.
   * @returns {Promise<string>} CSS text
   */
  static getShadowCSS() {
    if (window.VSC._shadowCSS !== undefined) {
      return Promise.resolve(window.VSC._shadowCSS);
    }

    // Cache the in-flight promise so concurrent calls don't trigger multiple fetches
    if (!this._shadowCSSPromise) {
      this._shadowCSSPromise = new Promise((resolve) => {
        const timeout = setTimeout(() => {
          docEl.removeEventListener('VSC_CSS_READY', onReady);
          logger.warn('StorageManager: shadow CSS timeout');
          window.VSC._shadowCSS = '';
          resolve('');
        }, 2000);

        function onReady(e) {
          docEl.removeEventListener('VSC_CSS_READY', onReady);
          clearTimeout(timeout);
          const css = e.detail || '';
          window.VSC._shadowCSS = css;
          resolve(css);
        }

        docEl.addEventListener('VSC_CSS_READY', onReady);
        docEl.dispatchEvent(new CustomEvent('VSC_REQUEST_CSS'));
      });
    }

    return this._shadowCSSPromise;
  }

  /**
   * Set settings in Chrome storage
   * @param {Object} data - Data to store
   * @returns {Promise<void>}
   */
  static async set(data) {
    if (hasChrome) {
      return new Promise((resolve, reject) => {
        chrome.storage.sync.set(data, () => {
          if (chrome.runtime.lastError) {
            const error = new Error(`Storage failed: ${chrome.runtime.lastError.message}`);
            logger.error(`Chrome storage save failed: ${chrome.runtime.lastError.message}`);
            if (this.errorCallback) {
              this.errorCallback(error, data);
            }
            reject(error);
            return;
          }
          logger.debug('StorageManager: saved to chrome.storage');
          resolve();
        });
      });
    }

    // MAIN world — bridge writes to chrome.storage via CustomEvent
    const detail = {};

    if (typeof data.lastSpeed === 'number' && Number.isFinite(data.lastSpeed)) {
      detail.lastSpeed = data.lastSpeed;
    }

    // Per-site sources persistence (our fork's addition)
    if (data.sources) {
      detail.sources = data.sources;
    }

    if (Object.keys(detail).length > 0) {
      docEl.dispatchEvent(new CustomEvent('VSC_WRITE_STORAGE', { detail }));
    } else {
      logger.warn(`StorageManager.set: cannot bridge from MAIN. Keys: ${Object.keys(data).join(', ')}`);
    }

    // Update local settings cache regardless (keeps in-memory state current)
    window.VSC_settings = { ...window.VSC_settings, ...data };
    return Promise.resolve();
  }

  /**
   * Remove keys from storage
   * @param {Array<string>} keys - Keys to remove
   * @returns {Promise<void>}
   */
  static async remove(keys) {
    if (hasChrome) {
      return new Promise((resolve, reject) => {
        chrome.storage.sync.remove(keys, () => {
          if (chrome.runtime.lastError) {
            const error = new Error(`Storage remove failed: ${chrome.runtime.lastError.message}`);
            logger.error(`Chrome storage remove failed: ${chrome.runtime.lastError.message}`);
            if (this.errorCallback) {
              this.errorCallback(error, { removedKeys: keys });
            }
            reject(error);
            return;
          }
          resolve();
        });
      });
    }
    // No chrome.storage — update local cache only
    if (window.VSC_settings) {
      keys.forEach((key) => delete window.VSC_settings[key]);
    }
    return Promise.resolve();
  }

  /**
   * Clear all storage
   * @returns {Promise<void>}
   */
  static async clear() {
    if (hasChrome) {
      return new Promise((resolve, reject) => {
        chrome.storage.sync.clear(() => {
          if (chrome.runtime.lastError) {
            const error = new Error(`Storage clear failed: ${chrome.runtime.lastError.message}`);
            logger.error(`Chrome storage clear failed: ${chrome.runtime.lastError.message}`);
            if (this.errorCallback) {
              this.errorCallback(error, { operation: 'clear' });
            }
            reject(error);
            return;
          }
          resolve();
        });
      });
    }
    window.VSC_settings = {};
    return Promise.resolve();
  }

  /**
   * Listen for storage changes
   * @param {Function} callback - Callback with changes in chrome.storage.onChanged format
   */
  static onChanged(callback) {
    if (hasChrome) {
      chrome.storage.onChanged.addListener((changes, areaName) => {
        if (areaName === 'sync') {
          callback(changes);
        }
      });
    } else {
      docEl.addEventListener('VSC_STORAGE_CHANGED', (e) => {
        const changes = e.detail;
        for (const [key, change] of Object.entries(changes)) {
          if (change.newValue !== undefined) {
            window.VSC_settings = window.VSC_settings || {};
            window.VSC_settings[key] = change.newValue;
          }
        }
        callback(changes);
      });
    }
  }
}

// Create singleton instance
window.VSC.StorageManager = StorageManager;
