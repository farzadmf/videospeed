/**
 * Integration tests for modular architecture
 * Using global variables to match browser extension architecture
 */

import { installChromeMock, cleanupChromeMock, resetMockStorage } from '../helpers/chrome-mock.js';
import { SimpleTestRunner, assert, createMockVideo, createMockDOM } from '../helpers/test-utils.js';
import { loadCoreModules } from '../helpers/module-loader.js';

// Load all required modules
await loadCoreModules();

const runner = new SimpleTestRunner();
let mockDOM;

runner.beforeEach(() => {
  installChromeMock();
  resetMockStorage();
  mockDOM = createMockDOM();
});

runner.afterEach(() => {
  cleanupChromeMock();
  if (mockDOM) {
    mockDOM.cleanup();
  }
});

runner.test('All core modules should load correctly', async () => {
  try {
    assert.exists(window.VSC, 'VSC namespace should exist');
    assert.exists(window.VSC.videoSpeedConfig, 'VideoSpeedConfig should exist');
    assert.exists(window.VSC.VideoController, 'VideoController should exist');
    assert.exists(window.VSC.ActionHandler, 'ActionHandler should exist');
    assert.exists(window.VSC.EventManager, 'EventManager should exist');
    assert.exists(window.VSC.siteHandlerManager, 'siteHandlerManager should exist');
  } catch (error) {
    throw new Error(`Module import failed: ${error.message}`);
  }
});

runner.test('Site handlers should be configurable', async () => {
  const siteHandlerManager = window.VSC.siteHandlerManager;

  const handler = siteHandlerManager.getCurrentHandler();
  assert.exists(handler);

  // Should return positioning info
  const mockVideo = createMockVideo();
  const positioning = siteHandlerManager.getControllerPosition(mockDOM.container, mockVideo);
  assert.exists(positioning);
  assert.exists(positioning.insertionPoint);
});

runner.test('Settings should integrate with ActionHandler', async () => {
  const config = window.VSC.videoSpeedConfig;
  await config.load();

  const eventManager = new window.VSC.EventManager(config, null);
  // ActionHandler is created but not used in this test - just ensuring it can be instantiated
  new window.VSC.ActionHandler(config, eventManager);

  // Should be able to get key bindings
  const fasterValue = config.getKeyBinding('faster');
  assert.equal(typeof fasterValue, 'number');
});

runner.test('VideoController should integrate with all dependencies', async () => {
  const config = window.VSC.videoSpeedConfig;
  await config.load();

  const eventManager = new window.VSC.EventManager(config, null);
  const actionHandler = new window.VSC.ActionHandler(config, eventManager);

  const mockVideo = createMockVideo();
  mockDOM.container.appendChild(mockVideo);

  const controller = new window.VSC.VideoController(mockVideo, null, config, actionHandler);

  assert.exists(controller);
  assert.exists(controller.div);
  assert.exists(mockVideo.vsc);
});

runner.test('Event system should coordinate between modules', async () => {
  const config = window.VSC.videoSpeedConfig;
  await config.load();

  const eventManager = new window.VSC.EventManager(config, null);
  const actionHandler = new window.VSC.ActionHandler(config, eventManager);
  eventManager.actionHandler = actionHandler;

  // Should be able to set up event listeners
  eventManager.setupEventListeners(document);

  // Should be able to clean up
  eventManager.cleanup();

  assert.true(true); // If we get here without errors, integration works
});

// Run tests if this file is loaded directly
if (typeof window !== 'undefined' && window.location) {
  runner.run().then((results) => {
    console.log('Module integration tests completed:', results);
  });
}

export { runner as moduleIntegrationTestRunner };
