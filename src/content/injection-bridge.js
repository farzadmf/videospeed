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
  link.href = chrome.runtime.getURL('src/styles/inject_new.css');
  document.head.appendChild(link);

  const shadowCssUrl = chrome.runtime.getURL('src/styles/shadow_new.css');
  const response = await fetch(shadowCssUrl);
  const shadowCss = await response.text();

  // The div used (and removed) in shadow-dom-manager file to get shadow CSS contents.
  const shadowCssDivId = 'vsc-shadow-css-content';
  const shadowCssDiv =
    document.querySelector(`#${shadowCssDivId}`) ?? document.createElement('div');

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
 * Set up message bridge between content script and page context
 * Handles bi-directional communication for popup and settings updates
 */
export function setupMessageBridge() {
  // Listen for messages from the page context (injected script)
  window.addEventListener('message', (event) => {
    if (event.source !== window || !event.data?.source?.startsWith('vsc-')) {
      return;
    }

    const { source, action, data } = event.data;

    try {
      if (source === 'vsc-page') {
        // Forward page messages to extension runtime
        if (action === 'storage-update') {
          chrome.storage.sync.set(data);
        } else if (action === 'runtime-message') {
          chrome.runtime.sendMessage(data);
        } else if (action === 'get-storage') {
          // Page script requesting current storage
          chrome.storage.sync.get(null, (items) => {
            window.postMessage(
              {
                source: 'vsc-content',
                action: 'storage-data',
                data: items,
              },
              '*'
            );
          });
        }
      }
    } catch {
      // MyNote: added try/catch, ignoring error. Seeing 'Extension context invalidated'
      //         here constantly.
    }
  });

  // Listen for messages from popup/background
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    // Forward to page context using CustomEvent (matching what inject.js expects)
    window.dispatchEvent(
      new CustomEvent('VSC_MESSAGE', {
        detail: request,
      })
    );

    // Handle responses if needed
    if (request.action === 'get-status') {
      // Wait for response from page context
      const responseHandler = (event) => {
        if (event.data?.source === 'vsc-page' && event.data?.action === 'status-response') {
          window.removeEventListener('message', responseHandler);
          sendResponse(event.data.data);
        }
      };
      window.addEventListener('message', responseHandler);
      return true; // Keep message channel open for async response
    }
  });

  // Listen for storage changes from other extension contexts
  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'sync') {
      // Forward storage changes to page context
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
  });
}
