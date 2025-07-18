/**
 * Unit tests for settings management
 * Using global variables to match browser extension architecture
 */

import { installChromeMock, cleanupChromeMock, resetMockStorage } from '../../helpers/chrome-mock.js';
import { SimpleTestRunner, assert, wait } from '../../helpers/test-utils.js';

// Load modules by executing them to populate global variables
import '../../../src/utils/constants.js';
import '../../../src/utils/logger.js';
import '../../../src/core/storage-manager.js';
import '../../../src/core/settings.js';

const runner = new SimpleTestRunner();

runner.beforeEach(() => {
  installChromeMock();
  resetMockStorage();
  
  // Clear any injected settings for clean tests
  if (window.VSC && window.VSC.StorageManager) {
    window.VSC.StorageManager._injectedSettings = null;
  }
});

runner.afterEach(() => {
  cleanupChromeMock();
});

runner.test('VideoSpeedConfig should initialize with default settings', () => {
  // Access VideoSpeedConfig from global scope
  const config = window.VSC.videoSpeedConfig;
  assert.exists(config.settings);
  assert.equal(config.settings.enabled, true);
  assert.equal(config.settings.lastSpeed, 1.0);
  assert.equal(config.settings.logLevel, 3);
});

runner.test('VideoSpeedConfig should load settings from storage', async () => {
  const config = window.VSC.videoSpeedConfig;
  const settings = await config.load();
  
  assert.exists(settings);
  assert.equal(settings.enabled, true);
  assert.equal(settings.lastSpeed, 1.0);
});

runner.test('VideoSpeedConfig should save settings to storage', async () => {
  const config = window.VSC.videoSpeedConfig;
  await config.load();
  
  await config.save({ lastSpeed: 2.0, enabled: false });
  
  assert.equal(config.settings.lastSpeed, 2.0);
  assert.equal(config.settings.enabled, false);
});

runner.test('VideoSpeedConfig should handle key bindings', async () => {
  // Clear any injected settings for clean test
  window.VSC.StorageManager._injectedSettings = null;
  
  // Create fresh config instance
  const config = new window.VSC.VideoSpeedConfig();
  
  // Force load with defaults only
  const storage = await window.VSC.StorageManager.get(window.VSC.Constants.DEFAULT_SETTINGS);
  config.settings.keyBindings = [];
  await config.initializeDefaultKeyBindings(storage);
  
  const fasterValue = config.getKeyBinding('faster');
  assert.equal(fasterValue, 0.1);
  
  config.setKeyBinding('faster', 0.2);
  const updatedValue = config.getKeyBinding('faster');
  assert.equal(updatedValue, 0.2);
});

runner.test('VideoSpeedConfig should track media elements', () => {
  const config = window.VSC.videoSpeedConfig;
  const mockVideo = document.createElement('video');
  
  config.addMediaElement(mockVideo);
  assert.equal(config.getMediaElements().length, 1);
  assert.equal(config.getMediaElements()[0], mockVideo);
  
  config.removeMediaElement(mockVideo);
  assert.equal(config.getMediaElements().length, 0);
});

runner.test('VideoSpeedConfig should handle invalid key binding requests gracefully', () => {
  const config = window.VSC.videoSpeedConfig;
  
  const result = config.getKeyBinding('nonexistent');
  assert.equal(result, false);
  
  // Should not throw
  config.setKeyBinding('nonexistent', 123);
});

// Run tests if this file is loaded directly
if (typeof window !== 'undefined' && window.location) {
  runner.run().then(results => {
    console.log('Settings tests completed:', results);
  });
}

export { runner as settingsTestRunner };