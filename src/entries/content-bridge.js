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
 *
 * Once disabled, a document stays inactive until reload: the popup asks for a
 * reload, and a live re-init would reuse the settings snapshot from page load.
 */
import { MESSAGE_TYPES } from '../shared/constants.js';
import { isBlacklisted } from '../utils/blacklist.js';

// Speed limits for page→bridge write validation.
// Duplicated from constants.js (ISOLATED world can't import page modules).
const SPEED_MIN = 0.07;
const SPEED_MAX = 16;

const docEl = document.documentElement;
let bridgeInitialized = false;

// 'pending' until the handshake answers; 'inactive' once aborted or disabled.
let bridgeState = 'pending';

// Set by any enabled toggle involving false, even one that lands before the
// handshake: the settings snapshot read at load no longer holds.
let disabledForDocument = false;

function dispatchAbort() {
  docEl.dispatchEvent(new CustomEvent('VSC_SETTINGS_READY', { detail: { abort: true } }));
}

function init() {
  try {
    // Double-injection guard (module-level flag resets on page navigation)
    if (bridgeInitialized) {
      return;
    }
    bridgeInitialized = true;

    // about: documents (blank, srcdoc) have no site URL to check rules
    // against. Fail closed rather than run on a disabled site's child frame.
    if (location.protocol === 'about:') {
      bridgeState = 'inactive';
      docEl.addEventListener('VSC_REQUEST_SETTINGS', dispatchAbort, { once: true });
      return;
    }

    // Kick off settings read early (cheap), but defer shadow CSS fetch
    // until the MAIN world actually requests settings — no point fetching
    // CSS on pages that never initialize a controller.
    const settingsReady = chrome.runtime?.id
      ? chrome.storage.sync.get(null).catch((error) => {
          console.error('[VSC] Initial settings load failed:', error);
          return null;
        })
      : Promise.resolve(null);

    // Register listener SYNCHRONOUSLY so we never miss the MAIN world's request.
    docEl.addEventListener(
      'VSC_REQUEST_SETTINGS',
      async () => {
        const payload = await buildPayload(settingsReady);
        bridgeState = payload.abort ? 'inactive' : 'active';
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

async function buildPayload(settingsReady) {
  const settings = await settingsReady;

  if (!settings) {
    return { abort: true };
  }

  const disabled = disabledForDocument || settings.enabled === false;
  const blacklisted = isBlacklisted(settings.blacklist, location.hostname);

  if (disabled || blacklisted) {
    return { abort: true };
  }

  delete settings.blacklist;
  delete settings.enabled;

  const getSound = (name) => (chrome.runtime?.id ? chrome.runtime.getURL(`assets/sounds/${name}`) : '');
  const soundUrls = {
    beep: getSound('beep.oga'),
    cartoon_blinking_01: getSound('cartoon_blinking_01.oga'),
    cartoon_blinking_02: getSound('cartoon_blinking_02.oga'),
    game_start: getSound('game_start.oga'),
    new_notification: getSound('new_notification.oga'),
    pop_01: getSound('pop_01.oga'),
    pop_02: getSound('pop_02.oga'),
  };

  return { settings, soundUrls };
}

function setupOngoingListeners() {
  // --- Storage change relay + lifecycle ---
  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace !== 'sync') {
      return;
    }

    // Lifecycle: only the popup's enabled toggle triggers teardown. Options
    // page never writes `enabled`, so saving options can't trigger lifecycle —
    // it only relays settings via VSC_STORAGE_CHANGED below. blacklist changes
    // and re-enabling take effect on next page load.
    const enabledChange = changes.enabled;
    if (enabledChange?.oldValue === false || enabledChange?.newValue === false) {
      disabledForDocument = true;
    }
    if (enabledChange?.newValue === false) {
      bridgeState = 'inactive';
      docEl.dispatchEvent(new CustomEvent('VSC_MESSAGE', { detail: { type: MESSAGE_TYPES.TEARDOWN } }));
      return;
    }
    if (bridgeState !== 'active') {
      return;
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
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    // Only the top frame answers: sendMessage broadcasts to every frame, and
    // MAIN reports the hub-wide count, so extra frames would race conflicting
    // replies into the popup's single callback.
    if (request?.type === MESSAGE_TYPES.STATUS) {
      if (window !== window.top) {
        return;
      }

      // MAIN is torn down or never started; answer for it so the popup shows
      // "disabled" rather than stale counts or "unreachable".
      if (bridgeState === 'inactive') {
        sendResponse({ abort: true, controllerCount: 0, initialized: false });
        return;
      }

      const onReply = (e) => {
        docEl.removeEventListener('VSC_STATUS_REPLY', onReply);
        sendResponse(e.detail);
      };
      docEl.addEventListener('VSC_STATUS_REPLY', onReply);

      docEl.dispatchEvent(new CustomEvent('VSC_MESSAGE', { detail: request }));

      return true; // keep the channel open for the async sendResponse
    }

    if (bridgeState !== 'inactive') {
      docEl.dispatchEvent(new CustomEvent('VSC_MESSAGE', { detail: request }));
    }
  });

  // --- Storage write-back from MAIN world ---
  const handleWriteStorage = (e) => {
    try {
      if (bridgeState !== 'active') {
        return;
      }

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
