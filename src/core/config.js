/**
 * Settings management for Video Speed Controller
 */

window.VSC = window.VSC || {};

import { logger } from '../utils/logger.js';
import { StorageManager } from './storage-manager.js';
import { VSC_DEFAULTS } from '../shared/defaults.js';

export class VideoSpeedConfig {
  constructor() {
    this.settings = { ...VSC_DEFAULTS };

    this.pendingSave = null;
    this.saveTimer = null;
    this.SAVE_DELAY = 1000; // 1 second
    this._loaded = false;
    // Tracks the last speed value we wrote to storage, so the onChanged
    // listener can distinguish our own echo from a genuine external write.
    this._lastWrittenSpeed = null;

    this._setupStorageListener();
  }

  /**
   * Listen for storage changes from other contexts and update in-memory state.
   * Prevents the stale-read problem where e.g. the options page holds an old
   * lastSpeed while the content script has already updated it.
   * @private
   */
  _setupStorageListener() {
    try {
      StorageManager.onChanged((changes) => {
        for (const [key, change] of Object.entries(changes)) {
          if (!(key in this.settings) || change.newValue === undefined) {
            continue;
          }

          // Self-echo guard: skip our own debounced speed write echoing back.
          if (key === 'lastSpeed') {
            const isSelfEcho = this._lastWrittenSpeed !== null && change.newValue === this._lastWrittenSpeed;
            this._lastWrittenSpeed = null;
            if (isSelfEcho) {
              continue;
            }
          }

          this.settings[key] = change.newValue;

          // External lastSpeed write while we have a pending debounce:
          // cancel our stale timer — the external value is more recent.
          if (key === 'lastSpeed' && this.saveTimer) {
            clearTimeout(this.saveTimer);
            this.saveTimer = null;
            this.pendingSave = null;
          }

          logger.debug(`Settings updated from storage change: ${key}`);
        }
      });
    } catch (e) {
      // StorageManager may not be fully available yet (e.g. during tests).
      logger.debug(`Could not set up storage change listener: ${e.message}`);
    }
  }

  /**
   * Load settings from Chrome storage or pre-injected settings
   * @returns {Promise<Object>} Loaded settings
   */
  async load() {
    try {
      // Use StorageManager which handles both contexts automatically
      const storage = await StorageManager.get(VSC_DEFAULTS);

      // null = bridge signaled abort (site disabled/blacklisted)
      if (storage === null) {
        this.settings._abort = true;
        return;
      }

      // Storage read complete — save() is now safe (we have real data, not defaults).
      // Set before keyBindings init below, which calls save() internally.
      this._loaded = true;

      // Handle key bindings migration/initialization
      this.settings.keyBindings = storage.keyBindings || VSC_DEFAULTS.keyBindings;

      if (!storage.keyBindings || storage.keyBindings.length === 0) {
        logger.info('First initialization - setting up default key bindings');
        this.settings.keyBindings = [...VSC_DEFAULTS.keyBindings];
      }

      this.settings.sources = storage.sources || {};
      this.settings.sites = storage.sites || {};

      // Apply loaded settings
      this.settings.anchorPositioning = Boolean(storage.anchorPositioning);
      this.settings.audioBoolean = Boolean(storage.audioBoolean);
      this.settings.controllerButtonSize = Number(storage.controllerButtonSize);
      this.settings.controllerOpacity = Number(storage.controllerOpacity);
      this.settings.exclusiveKeys = Boolean(storage.exclusiveKeys);
      this.settings.forceLastSavedSpeed = Boolean(storage.forceLastSavedSpeed);
      this.settings.logLevel = Number(storage.logLevel || VSC_DEFAULTS.logLevel);
      this.settings.rememberSpeed = Boolean(storage.rememberSpeed);

      // UPSTREAM: lastSpeed = null means "no user choice yet this session."
      // null vs 1.0 distinguishes "hasn't acted" from "deliberately chose 1.0."
      // MyNote: our getTargetSpeed uses per-URL sources, not global lastSpeed,
      // so this mainly affects upstream-parity code paths (action-handler
      // getPreferredSpeed, commented-out cooldown). The || 1.0 fallbacks
      // in those paths handle null correctly.
      if (this.settings.rememberSpeed) {
        this.settings.lastSpeed = Number(storage.lastSpeed) || null;
      } else {
        this.settings.lastSpeed = null;
      }

      this.settings.startHidden = Boolean(storage.startHidden);

      // Update logger verbosity
      logger.setVerbosity(this.settings.logLevel);

      logger.info('Settings loaded successfully');
      return this.settings;
    } catch (error) {
      logger.error(`Failed to load settings: ${error.message}`);
      return VSC_DEFAULTS;
    }
  }

  /**
   * Save settings to Chrome storage
   *
   * Only the keys present in newSettings are written to storage.
   * This avoids the "stale full-blob write" race condition where two contexts
   * (e.g. options page + content script) each hold their own in-memory copy
   * and overwrite each other's changes.
   *
   * @param {Object} newSettings - Settings to save (only these keys are written)
   * @returns {Promise<boolean>} true if persisted (or debounced), false on storage failure
   */
  async save(newSettings = {}) {
    const keys = Object.keys(newSettings);
    if (keys.length === 0) {
      return true;
    }

    // Guard: refuse to write before load() has read from storage.
    if (!this._loaded) {
      logger.error('save() called before load() — refusing to overwrite user data with defaults');
      return false;
    }

    // Update in-memory settings immediately
    this.settings = { ...this.settings, ...newSettings };

    // MyNote: is there even a thing of only saving speed?!
    // Check if this is a speed-only update that should be debounced
    if (keys.length === 1 && keys[0] === 'lastSpeed') {
      this.pendingSave = newSettings.lastSpeed;

      clearTimeout(this.saveTimer);

      this.saveTimer = setTimeout(async () => {
        const speedToSave = this.pendingSave;
        this.pendingSave = null;
        this.saveTimer = null;

        this._lastWrittenSpeed = speedToSave;
        try {
          await StorageManager.set({ lastSpeed: speedToSave });
          logger.info('Debounced speed setting saved successfully');
        } catch (error) {
          this._lastWrittenSpeed = null;
          logger.error(`Failed to persist speed: ${error.message}`);
        }
      }, this.SAVE_DELAY);

      return true;
    }

    try {
      await StorageManager.set(newSettings);
    } catch (error) {
      logger.error(`Failed to save settings: ${error.message}`);
      return false;
    }

    if (newSettings.logLevel !== undefined) {
      logger.setVerbosity(this.settings.logLevel);
    }

    logger.info('Settings saved successfully');
    return true;
  }

  /**
   * Sync speed value in storage
   * @typedef {Object} SyncSpeedValueOptions
   * @property {number} speed - Speed value to sync
   * @property {string} url - URL associated with the speed value
   * @param {SyncSpeedValueOptions} options - Options for syncing speed value
   */
  syncSpeedValue({ speed, url }) {
    logger.debug('Storing lastSpeed in settings for the rememberSpeed feature');

    if (!speed || Number(speed) === 1) {
      // No need to save 1x; it's the default, also it helps to avoid reaching Chrome sync max item size.
      delete this.settings.sources[url];
    } else {
      this.settings.lastSpeed = speed;

      this.settings.sources[url] = this.settings.sources[url] || {};
      this.settings.sources[url].speed = speed;
      this.settings.sources[url].updated = new Date().valueOf();
    }

    this.save({
      lastSpeed: this.settings.lastSpeed,
      sources: this.settings.sources,
    });
  }

  /**
   * Get an action by name
   * @param {string} actionName - Action name to search
   */
  getActionByName(actionName) {
    return this.settings.keyBindings.find((item) => item.action.name === actionName);
  }

  /**
   * Get an action based on the received keyboard event
   * @param {KeyboardEvent} event - Keyboard event
   */
  getActionByKeyEvent(event) {
    const code = event.code;
    const alt = !!event.altKey;
    const shift = !!event.shiftKey;
    const ctrl = !!event.ctrlKey;

    return this.settings.keyBindings.find(
      (binding) => binding.code === code && !!binding.alt === alt && !!binding.shift === shift && !!binding.ctrl === ctrl
    );
  }

  /**
   * Get a specific key binding
   * @param {string} action - Action name
   * @param {string} property - Property to get (default: 'value')
   * @returns {*} Key binding property value
   */
  getKeyBinding(action, property = 'value') {
    try {
      const binding = this.settings.keyBindings.find((item) => item.action === action);
      return binding ? binding[property] : false;
    } catch (e) {
      logger.error(`Failed to get key binding for ${action}: ${e.message}`);
      return false;
    }
  }

  /**
   * Set a key binding value
   * @param {string} action - Action name
   * @param {*} value - Value to set
   */
  setKeyBinding(action, value) {
    try {
      const binding = this.settings.keyBindings.find((item) => item.action === action);
      if (binding) {
        binding.value = value;
      }
    } catch (e) {
      logger.error(`Failed to set key binding for ${action}: ${e.message}`);
    }
  }
}

// Create singleton instance
export const config = new VideoSpeedConfig();

// Create singleton instance
window.VSC.videoSpeedConfig = new VideoSpeedConfig();

// Export constructor for testing
window.VSC.VideoSpeedConfig = VideoSpeedConfig;
