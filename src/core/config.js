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
  }

  /**
   * Load settings from Chrome storage or pre-injected settings
   * @returns {Promise<Object>} Loaded settings
   */
  async load() {
    try {
      // Use StorageManager which handles both contexts automatically
      const storage = await StorageManager.get(VSC_DEFAULTS);

      // Handle key bindings migration/initialization
      this.settings.keyBindings = storage.keyBindings || VSC_DEFAULTS.keyBindings;

      if (!storage.keyBindings || storage.keyBindings.length === 0) {
        logger.info('First initialization - setting up default key bindings');
        this.settings.keyBindings = [...VSC_DEFAULTS.keyBindings];
        await this.save({ keyBindings: this.settings.keyBindings });
      }

      this.settings.sources = storage.sources || {};

      // Apply loaded settings
      this.settings.audioBoolean = Boolean(storage.audioBoolean);
      this.settings.blacklist = storage.blacklist;
      this.settings.controllerButtonSize = Number(storage.controllerButtonSize);
      this.settings.controllerOpacity = Number(storage.controllerOpacity);
      this.settings.displayKeyCode = Number(storage.displayKeyCode);
      this.settings.enabled = Boolean(storage.enabled);
      this.settings.forceLastSavedSpeed = Boolean(storage.forceLastSavedSpeed);
      this.settings.lastSpeed = Number(storage.lastSpeed);
      this.settings.logLevel = Number(storage.logLevel || VSC_DEFAULTS.logLevel);
      this.settings.rememberSpeed = Boolean(storage.rememberSpeed);
      this.settings.startHidden = Boolean(storage.startHidden);

      // Ensure display binding exists (for upgrades)
      this.ensureDisplayBinding(storage);

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
   * @param {Object} newSettings - Settings to save
   * @returns {Promise<void>}
   */
  async save(newSettings = {}) {
    try {
      this.settings = { ...this.settings, ...newSettings };

      // Update logger verbosity if logLevel was changed
      if (newSettings.logLevel !== undefined) {
        logger.setVerbosity(newSettings.logLevel);
      }

      await StorageManager.set(this.settings);
      logger.info('Settings saved successfully');
    } catch (error) {
      logger.error(`Failed to save settings: ${error.message}`);
    }
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
    const shift = !!event.shiftKey;
    const ctrl = !!event.ctrlKey;

    return this.settings.keyBindings.find(
      (binding) => binding.code === code && !!binding.shift === shift && !!binding.ctrl === ctrl
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

  /**
   * Ensure display binding exists in key bindings
   * @param {Object} storage - Storage object
   * @private
   */
  ensureDisplayBinding(storage) {
    if (this.settings.keyBindings.filter((x) => x.action === 'display').length === 0) {
      this.settings.keyBindings.push({
        action: 'display',
        key: Number(storage.displayKeyCode) || 86,
        value: 0,
        force: false,
        predefined: true,
      });
    }
  }
}

// Create singleton instance
export const config = new VideoSpeedConfig();

// Create singleton instance
window.VSC.videoSpeedConfig = new VideoSpeedConfig();

// Export constructor for testing
window.VSC.VideoSpeedConfig = VideoSpeedConfig;
