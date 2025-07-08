/**
 * Settings management for Video Speed Controller
 * Modular architecture using global variables
 */

window.VSC = window.VSC || {};

import { logger } from '../utils/logger.js';
import { StorageManager } from './storage-manager.js';
import { VSC_DEFAULTS } from '../shared/defaults.js';

class VideoSpeedConfig {
  constructor() {
    this.settings = { ...VSC_DEFAULTS };
    this.mediaElements = [];
  }

  /**
   * Load settings from Chrome storage
   * @returns {Promise<Object>} Loaded settings
   */
  async load() {
    try {
      // In injected context, wait for user settings to be available
      const isInjectedContext = typeof chrome === 'undefined' || !chrome.storage;
      const storage = isInjectedContext
        ? await StorageManager.waitForInjectedSettings(VSC_DEFAULTS)
        : await StorageManager.get(VSC_DEFAULTS);

      // Handle key bindings migration/initialization
      this.settings.keyBindings = storage.keyBindings || [];

      if (!storage.keyBindings || storage.keyBindings.length === 0) {
        logger.info('First initialization - setting up default key bindings');
        await this.initializeDefaultKeyBindings();
      }

      // Apply loaded settings
      this.settings.lastSpeed = Number(storage.lastSpeed);
      this.settings.displayKeyCode = Number(storage.displayKeyCode);
      this.settings.rememberSpeed = Boolean(storage.rememberSpeed);
      this.settings.forceLastSavedSpeed = Boolean(storage.forceLastSavedSpeed);
      this.settings.audioBoolean = Boolean(storage.audioBoolean);
      this.settings.enabled = Boolean(storage.enabled);
      this.settings.startHidden = Boolean(storage.startHidden);
      this.settings.controllerOpacity = Number(storage.controllerOpacity);
      this.settings.controllerButtonSize = Number(storage.controllerButtonSize);
      this.settings.blacklist = String(storage.blacklist);
      this.settings.logLevel = Number(storage.logLevel || VSC_DEFAULTS.logLevel);

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
      await StorageManager.set(this.settings);
      logger.info('Settings saved successfully');
    } catch (error) {
      logger.error(`Failed to save settings: ${error.message}`);
    }
  }

  getActionByName(actionName) {
    return this.settings.keyBindings.find((item) => item.action.name === actionName);
  }

  getActionByKeyEvent(event) {
    const keyCode = event.keyCode;
    const shift = !!event.shiftKey;
    const ctrl = !!event.ctrlKey;

    return this.settings.keyBindings.find(
      (item) => item.key === keyCode && !!item.shift === shift && !!item.ctrl === ctrl
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
   * Initialize default key bindings for first-time setup
   * @param {Object} storage - Storage object with legacy values
   * @private
   */
  async initializeDefaultKeyBindings() {
    const keyBindings = VSC_DEFAULTS.keyBindings;

    this.settings.keyBindings = keyBindings;
    this.settings.version = '0.5.3';

    // Save the migrated settings
    await StorageManager.set({
      audioBoolean: this.settings.audioBoolean,
      blacklist: this.settings.blacklist,
      controllerButtonSize: this.settings.controllerButtonSize,
      controllerOpacity: this.settings.controllerOpacity,
      displayKeyCode: this.settings.displayKeyCode,
      enabled: this.settings.enabled,
      forceLastSavedSpeed: this.settings.forceLastSavedSpeed,
      keyBindings: this.settings.keyBindings,
      rememberSpeed: this.settings.rememberSpeed,
      startHidden: this.settings.startHidden,
      version: this.settings.version,
    });
  }

  /**
   * Ensure display binding exists (for version upgrades)
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

  /**
   * Add a media element to tracking
   * @param {HTMLMediaElement} element - Media element to track
   */
  addMediaElement(element) {
    if (!this.mediaElements.includes(element)) {
      this.mediaElements.push(element);
    }
  }

  /**
   * Remove a media element from tracking
   * @param {HTMLMediaElement} element - Media element to remove
   */
  removeMediaElement(element) {
    const index = this.mediaElements.indexOf(element);
    if (index !== -1) {
      this.mediaElements.splice(index, 1);
    }
  }

  /**
   * Get all tracked media elements
   * @returns {Array<HTMLMediaElement>} Array of media elements
   */
  getMediaElements() {
    return this.mediaElements;
  }
}

// Create singleton instance
export const config = new VideoSpeedConfig();

// Also export the constructor for testing
window.VSC.VideoSpeedConfig = VideoSpeedConfig;

// Global variables available for both browser and testing
