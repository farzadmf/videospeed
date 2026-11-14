import { MESSAGE_TYPES } from './shared/constants.js';
import { logger } from './utils/logger.js';

/**
 * Update extension icon based on enabled state
 * @param {boolean} enabled - Whether extension is enabled
 */
async function updateIcon(enabled) {
  try {
    const suffix = enabled ? '' : '_disabled';
    await chrome.action.setIcon({
      path: {
        19: `assets/icons/icon19${suffix}.png`,
        38: `assets/icons/icon38${suffix}.png`,
        48: `assets/icons/icon48${suffix}.png`,
      },
    });
    logger.info(`Icon updated: ${enabled ? 'enabled' : 'disabled'}`);
  } catch (error) {
    logger.error('Failed to update icon:', error);
  }
}

/**
 * Initialize icon state from storage
 */
async function initializeIcon() {
  try {
    const storage = await chrome.storage.sync.get({ enabled: true });
    await updateIcon(storage.enabled);
  } catch (error) {
    logger.error('Failed to initialize icon:', error);
    // Default to enabled if storage read fails
    await updateIcon(true);
  }
}

/**
 * Migrate storage to current config version
 * Removes deprecated keys from older versions
 */
async function migrateConfig() {
  const DEPRECATED_KEYS = [
    // Removed in v0.9.x
    'speeds',
    'version',

    // Migrated to keyBindings array in v0.6.x
    'resetSpeed',
    'speedStep',
    'fastSpeed',
    'rewindTime',
    'advanceTime',
    'resetKeyCode',
    'slowerKeyCode',
    'fasterKeyCode',
    'rewindKeyCode',
    'advanceKeyCode',
    'fastKeyCode',
    'displayKeyCode',
  ];

  try {
    await chrome.storage.sync.remove(DEPRECATED_KEYS);
    logger.info('Config migrated to current version');
  } catch (error) {
    logger.error('Config migration failed:', error);
  }
}

/**
 * Listen for storage changes (extension enabled/disabled)
 */
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'sync' && changes.enabled) {
    updateIcon(changes.enabled.newValue !== false);
  }
});

// Every frame in every tab saves speeds into one stored `sources` map. A frame that
// wrote its own copy of the map would drop any change another frame made at the same
// time, so the service worker applies each save in turn, as the only writer.
let siteSpeedQueue = Promise.resolve();

/**
 * Save one site's speed. 1x is the default, so it is removed rather than stored,
 * which also keeps the map under the sync storage item limit.
 * @param {string} host
 * @param {number} speed
 */
async function applySiteSpeed(host, speed) {
  const { sources = {} } = await chrome.storage.sync.get('sources');

  if (speed === 1) {
    delete sources[host];
  } else {
    sources[host] = { ...sources[host], speed, updated: Date.now() };
  }

  await chrome.storage.sync.set({ sources });
}

chrome.runtime.onMessage.addListener((message, sender) => {
  if (message?.type !== MESSAGE_TYPES.SET_SITE_SPEED) {
    return;
  }

  // The host comes from Chrome's record of the sending frame, not the message: page
  // script can reach the bridge, and must not save speeds for another site.
  const host = sender.url ? new URL(sender.url).hostname : '';
  const { speed } = message;

  if (!host || typeof speed !== 'number' || !Number.isFinite(speed)) {
    return;
  }

  siteSpeedQueue = siteSpeedQueue
    .then(() => applySiteSpeed(host, speed))
    .catch((error) => logger.error(`Failed to save speed for ${host}:`, error));
});

/**
 * Initialize on install/update
 */
chrome.runtime.onInstalled.addListener(async () => {
  logger.info('Video Speed Controller installed/updated');
  await migrateConfig();
  await initializeIcon();
});

/**
 * Initialize on startup
 */
chrome.runtime.onStartup.addListener(async () => {
  logger.info('Video Speed Controller started');
  await initializeIcon();
});

// Initialize immediately when service worker loads
initializeIcon();

logger.info('Video Speed Controller background script loaded');
