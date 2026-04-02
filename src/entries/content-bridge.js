/**
 * Content Bridge — ISOLATED world thin bridge for chrome.* API access.
 *
 * Runs at document_start. Communicates with inject.js (MAIN world) via
 * CustomEvents on document.documentElement.
 *
 * Settings handshake:
 *   1. Bridge registers VSC_REQUEST_SETTINGS listener SYNCHRONOUSLY (before
 *      any async work) so it can never miss the MAIN world's request.
 *   2. Bridge kicks off async work (storage read + shadow CSS fetch) in parallel.
 *   3. When MAIN world fires VSC_REQUEST_SETTINGS, the listener waits for the
 *      async work to finish, then responds with VSC_SETTINGS_READY.
 */

import { isBlacklisted } from '../utils/blacklist.js';

// Speed limits for page→bridge write validation.
// Duplicated from constants.js (ISOLATED world can't import page modules).
const SPEED_MIN = 0.07;
const SPEED_MAX = 16;

const docEl = document.documentElement;
let bridgeInitialized = false;

function init() {
  try {
    // Skip about:blank frames — they share the parent window
    if (location.href === 'about:blank') {
      return;
    }

    // Double-injection guard (module-level flag resets on page navigation)
    if (bridgeInitialized) {
      return;
    }
    bridgeInitialized = true;

    // Kick off async work BEFORE registering the listener — the listener
    // will await this promise when it fires.
    const payloadReady = preparePayload();

    // Register listener SYNCHRONOUSLY so we never miss the MAIN world's request.
    docEl.addEventListener(
      'VSC_REQUEST_SETTINGS',
      async () => {
        const payload = await payloadReady;
        docEl.dispatchEvent(new CustomEvent('VSC_SETTINGS_READY', { detail: payload }));
      },
      { once: true }
    );

    // Set up ongoing listeners (these don't depend on the payload)
    setupOngoingListeners();
  } catch (error) {
    console.error('[VSC] Bridge init failed:', error);
  }
}

async function preparePayload() {
  const [settings, shadowCSS] = await Promise.all([chrome.storage.sync.get(null), fetchShadowCSS()]);

  const disabled = settings.enabled === false;
  // MyNote: using location.hostname consistently with our blacklist convention
  const blacklisted = isBlacklisted(settings.blacklist, location.hostname);

  if (disabled || blacklisted) {
    return { abort: true };
  }

  // Strip keys the MAIN world shouldn't see
  delete settings.blacklist;
  delete settings.enabled;

  return { settings, shadowCSS };
}

async function fetchShadowCSS() {
  try {
    const url = chrome.runtime.getURL('styles/shadow_new.css');
    const response = await fetch(url);
    return await response.text();
  } catch (e) {
    console.warn('[VSC] Bridge: failed to fetch shadow CSS:', e.message);
    return '';
  }
}

function setupOngoingListeners() {
  // --- Storage change relay + lifecycle ---
  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace !== 'sync') {
      return;
    }

    // Lifecycle checks FIRST — teardown/reinit before relaying changes
    const disabled = 'enabled' in changes && changes.enabled.newValue === false;
    // MyNote: using location.hostname consistently with our blacklist convention
    const blacklisted = 'blacklist' in changes && isBlacklisted(changes.blacklist.newValue, location.hostname);

    if (disabled || blacklisted) {
      docEl.dispatchEvent(new CustomEvent('VSC_MESSAGE', { detail: { type: 'VSC_TEARDOWN' } }));
      return;
    }

    const reEnabled = 'enabled' in changes && changes.enabled.newValue === true;
    const unblacklisted = 'blacklist' in changes && !blacklisted;
    if (reEnabled || unblacklisted) {
      docEl.dispatchEvent(new CustomEvent('VSC_MESSAGE', { detail: { type: 'VSC_REINIT' } }));
    }

    // Relay changes to MAIN world (filter out keys MAIN never received)
    const relayChanges = { ...changes };
    delete relayChanges.enabled;
    delete relayChanges.blacklist;
    if (Object.keys(relayChanges).length > 0) {
      docEl.dispatchEvent(new CustomEvent('VSC_STORAGE_CHANGED', { detail: relayChanges }));
    }
  });

  // --- Popup/background message relay ---
  chrome.runtime.onMessage.addListener((request) => {
    docEl.dispatchEvent(new CustomEvent('VSC_MESSAGE', { detail: request }));
  });

  // --- Storage write-back from MAIN world ---
  const handleWriteStorage = (e) => {
    try {
      const data = e.detail;
      if (!data || typeof data !== 'object') {
        return;
      }

      const storageUpdate = {};

      // lastSpeed can cross the trust boundary
      if ('lastSpeed' in data) {
        const speed = data.lastSpeed;
        if (typeof speed === 'number' && Number.isFinite(speed)) {
          storageUpdate.lastSpeed = Math.min(Math.max(speed, SPEED_MIN), SPEED_MAX);
        }
      }

      // Per-site sources persistence (our fork's addition)
      if ('sources' in data && typeof data.sources === 'object') {
        storageUpdate.sources = data.sources;
      }

      if (Object.keys(storageUpdate).length > 0) {
        chrome.storage.sync.set(storageUpdate);
      }
    } catch (err) {
      if (err.message?.includes('Extension context invalidated')) {
        docEl.removeEventListener('VSC_WRITE_STORAGE', handleWriteStorage);
      }
    }
  };
  docEl.addEventListener('VSC_WRITE_STORAGE', handleWriteStorage);
}

init();
