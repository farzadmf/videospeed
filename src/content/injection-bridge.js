/**
 * Content script injection helpers for bundled architecture
 * Handles script injection and message bridging between contexts
 */

/**
 * Inject a bundled script file into the page context
 * @param {string} scriptPath - Path to the bundled script file
 * @returns {Promise<void>}
 */
export async function injectScript(scriptPath) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL(scriptPath);
    script.onload = () => {
      script.remove();
      resolve();
    };
    script.onerror = () => {
      script.remove();
      reject(new Error(`Failed to load script: ${scriptPath}`));
    };
    (document.head || document.documentElement).appendChild(script);
  });
}

export async function injectCSS() {
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.type = 'text/css';
  // link.href = chrome.runtime.getURL('src/styles/inject.css');
  link.href = chrome.runtime.getURL('styles/inject_new.css');
  document.head.appendChild(link);

  const shadowCssUrl = chrome.runtime.getURL('styles/shadow_new.css');
  const response = await fetch(shadowCssUrl);
  const shadowCss = await response.text();

  // The div used (and removed) in shadow-dom-manager file to get shadow CSS contents.
  const shadowCssDivId = 'vsc-shadow-css-content';
  const shadowCssDiv = document.querySelector(`#${shadowCssDivId}`) ?? document.createElement('div');

  shadowCssDiv.id = shadowCssDivId;
  // MyNote: style is sometimes undefined for whatever reason! If that's the case, give up!
  if (!shadowCssDiv.style) {
    console.log('[FMVSC] WARNING: could not create shadowCssDiv ...');
    return;
  }
  shadowCssDiv.style.display = 'none';
  shadowCssDiv.textContent = shadowCss;
  document.body.appendChild(shadowCssDiv);
}

/**
 * Speed limits for page→content bridge validation.
 * Duplicated from constants.js because the content script (isolated world)
 * cannot import page-context modules.
 */
const SPEED_MIN = 0.07;
const SPEED_MAX = 16;

/**
 * Set up message bridge between content script and page context.
 *
 * Page → Content accepts only `set-speed` (validated, clamped number
 * with optional url for per-site source persistence).
 * Content → Page provides storage-changed broadcasts and VSC_MESSAGE commands.
 * All other persistent settings writes go through trusted extension contexts.
 */
export function setupMessageBridge() {
  // Named function so we can remove it on context invalidation
  function handlePageMessage(event) {
    if (event.source !== window || !event.data?.source?.startsWith('vsc-')) {
      return;
    }

    const { source, action, data } = event.data;

    if (source === 'vsc-page') {
      try {
        if (action === 'set-speed') {
          if (typeof data?.speed !== 'number' || !Number.isFinite(data.speed)) {
            console.warn('[VSC] Bridge: rejected set-speed — invalid speed value');
            return;
          }
          const clamped = Math.min(Math.max(data.speed, SPEED_MIN), SPEED_MAX);
          const storageUpdate = { lastSpeed: clamped };

          if (data.url) {
            // Per-site source persistence: read current sources, update entry, write back
            chrome.storage.sync.get({ sources: {} }, (items) => {
              const sources = items.sources || {};
              if (!clamped || clamped === 1) {
                delete sources[data.url];
              } else {
                sources[data.url] = sources[data.url] || {};
                sources[data.url].speed = clamped;
                sources[data.url].updated = Date.now();
              }
              storageUpdate.sources = sources;
              chrome.storage.sync.set(storageUpdate);
            });
          } else {
            chrome.storage.sync.set(storageUpdate);
          }
        } else {
          console.warn(`[VSC] Bridge: unrecognized page action "${action}"`);
        }
      } catch (e) {
        if (e.message?.includes('Extension context invalidated')) {
          window.removeEventListener('message', handlePageMessage);
        } else {
          // Content script context — no access to logger module
          console.warn('[VSC] Bridge error:', e.message);
        }
      }
    }
  }
  window.addEventListener('message', handlePageMessage);

  // Listen for messages from popup/background
  function handleRuntimeMessage(request, sender, sendResponse) {
    window.dispatchEvent(
      new CustomEvent('VSC_MESSAGE', {
        detail: request,
      })
    );

    if (request.action === 'get-status') {
      const responseHandler = (event) => {
        if (event.data?.source === 'vsc-page' && event.data?.action === 'status-response') {
          window.removeEventListener('message', responseHandler);
          sendResponse(event.data.data);
        }
      };
      window.addEventListener('message', responseHandler);
      return true;
    }
  }
  chrome.runtime.onMessage.addListener(handleRuntimeMessage);

  // Listen for storage changes from other extension contexts
  function handleStorageChanged(changes, namespace) {
    if (namespace === 'sync') {
      const changedData = {};
      for (const [key, { newValue }] of Object.entries(changes)) {
        changedData[key] = newValue;
      }
      window.postMessage(
        {
          source: 'vsc-content',
          action: 'storage-changed',
          data: changedData,
        },
        '*'
      );
    }
  }
  chrome.storage.onChanged.addListener(handleStorageChanged);

  return {
    /** Send a command to the page context via the same channel popup messages use. */
    sendCommand(type, payload) {
      window.dispatchEvent(new CustomEvent('VSC_MESSAGE', { detail: { type, payload } }));
    },

    /** Remove all listeners (tests, extension unload). */
    cleanup() {
      window.removeEventListener('message', handlePageMessage);
      chrome.runtime.onMessage.removeListener?.(handleRuntimeMessage);
      chrome.storage.onChanged.removeListener?.(handleStorageChanged);
    },
  };
}
