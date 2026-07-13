import 'bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';

import { NO_VALUE_ACTIONS } from '../../shared/actions.js';
import { addBinding, inputBlur, inputFilterNumbersOnly, inputFocus, recordKeyPress } from './helpers/bindings.js';
import { addLeaderBinding, recordLeaderBindingKey, recordLeaderKey } from './helpers/leader.js';
import { restoreDefaults, restoreOptions } from './helpers/restore.js';
import { saveOptions } from './helpers/save.js';
import { cleanUpSpeeds, loadSpeeds } from './helpers/toggle-speeds.js';

// Follow the OS light/dark preference. Inline scripts are blocked by the
// extension CSP, so this must live in the module, not a <script> in the HTML.
(function followColorScheme() {
  const query = matchMedia('(prefers-color-scheme: dark)');
  const apply = () => {
    document.documentElement.setAttribute('data-bs-theme', query.matches ? 'dark' : 'light');
  };
  apply();
  query.addEventListener('change', apply);
})();

function show_experimental() {
  // MyNote: upstream removed per-binding force dropdowns; this was showing them.
  // Kept as no-op in case other experimental features are added later.
}

function exportSettings() {
  const status = document.getElementById('status');
  chrome.storage.sync.get(null, (settings) => {
    try {
      const blob = new Blob([JSON.stringify(settings, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'videospeed-settings.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      status.textContent = 'Settings exported';
      setTimeout(() => {
        status.textContent = '';
      }, 2000);
    } catch (error) {
      status.textContent = `Error exporting settings: ${error.message}`;
      setTimeout(() => {
        status.textContent = '';
      }, 3000);
    }
  });
}

function importSettings() {
  document.getElementById('importFile').click();
}

async function handleImportFile(event) {
  const status = document.getElementById('status');
  const file = event.target.files[0];
  if (!file) {
    return;
  }

  // Reset so the same file can be re-selected
  event.target.value = '';

  try {
    const text = await file.text();
    let imported;
    try {
      imported = JSON.parse(text);
    } catch {
      throw new Error('File is not valid JSON');
    }

    if (!imported || typeof imported !== 'object' || !Array.isArray(imported.keyBindings)) {
      throw new Error('File does not look like a Video Speed Controller settings file');
    }

    // Clear existing storage and write imported settings
    await new Promise((resolve) => chrome.storage.sync.clear(resolve));
    await new Promise((resolve) => chrome.storage.sync.set(imported, resolve));

    // Reload UI
    document.querySelector('#shortcuts tbody').replaceChildren();
    restoreOptions();

    status.textContent = 'Settings imported successfully';
    setTimeout(() => {
      status.textContent = '';
    }, 2000);
  } catch (error) {
    status.textContent = `Import failed: ${error.message}`;
    setTimeout(() => {
      status.textContent = '';
    }, 4000);
  }
}

function previewSound(event) {
  const targetId = event.target.dataset.soundTarget;
  const select = document.getElementById(targetId);
  if (!select) {
    return;
  }

  const name = select.value;
  const url = chrome.runtime?.id ? chrome.runtime.getURL(`assets/sounds/${name}.oga`) : '';
  if (!url) {
    return;
  }

  const audio = new Audio(url);
  audio.volume = 0.5;
  audio.play().catch(() => {});
}

function forgetAll() {
  chrome.storage.sync.remove(['sources']);
  const forgetStatus = document.querySelector('#forgetStatus');
  forgetStatus.classList.toggle('d-none');
  setTimeout(() => forgetStatus.classList.toggle('d-none'), 1500);
}

document.addEventListener('DOMContentLoaded', () => {
  restoreOptions();
  loadSpeeds();

  const saveBtn = document.querySelector('#save');
  const discardBtn = document.querySelector('#discard');

  function markDirty() {
    saveBtn.classList.add('has-changes');
    saveBtn.classList.remove('saved');
    saveBtn.disabled = false;
    saveBtn.textContent = 'Save Settings *';
    discardBtn.classList.remove('d-none');
  }
  function markClean() {
    saveBtn.classList.remove('has-changes');
    saveBtn.classList.add('saved');
    saveBtn.disabled = true;
    saveBtn.textContent = 'Save Settings';
    discardBtn.classList.add('d-none');
    setTimeout(() => saveBtn.classList.remove('saved'), 1500);
  }

  // Catch all form changes via delegation (covers dynamic rows too)
  document.body.addEventListener('input', markDirty);
  document.body.addEventListener('change', markDirty);

  saveBtn.addEventListener('click', () => {
    saveOptions();
    markClean();
  });
  discardBtn.addEventListener('click', () => {
    document.querySelector('#shortcuts tbody').replaceChildren();
    restoreOptions();
    markClean();
  });
  document.querySelector('#add').addEventListener('click', () => {
    addBinding();
    markDirty();
  });
  document.querySelector('#leaderAdd').addEventListener('click', () => {
    addLeaderBinding();
    markDirty();
  });
  document.querySelector('#restore').addEventListener('click', () => {
    restoreDefaults();
    markDirty();
  });
  document.querySelector('#export').addEventListener('click', exportSettings);
  document.querySelector('#import').addEventListener('click', importSettings);
  document.querySelector('#importFile').addEventListener('change', handleImportFile);
  document.querySelector('#experimental').addEventListener('click', show_experimental);
  document.querySelector('#forgetAll').addEventListener('click', forgetAll);
  document.querySelector('#cleanUp').addEventListener('click', cleanUpSpeeds);
  document.querySelector('#about').addEventListener('click', () => {
    window.open('https://github.com/farzadmf/videospeed');
  });

  document.querySelector('#feedback').addEventListener('click', () => {
    window.open('https://github.com/farzadmf/videospeed/issues');
  });

  function eventCaller(event, className, funcName) {
    if (!event.target.classList.contains(className)) {
      return;
    }
    funcName(event);
  }

  document.addEventListener('keypress', (event) => {
    eventCaller(event, 'customValue', inputFilterNumbersOnly);
  });
  document.addEventListener('focus', (event) => {
    eventCaller(event, 'customKey', inputFocus);
  });
  document.addEventListener('blur', (event) => {
    eventCaller(event, 'customKey', inputBlur);
  });
  document.addEventListener('keydown', (event) => {
    eventCaller(event, 'customKey', recordKeyPress);
    eventCaller(event, 'leaderKey', recordLeaderKey);
    eventCaller(event, 'leaderBindingKey', recordLeaderBindingKey);
  });
  document.addEventListener('click', (event) => {
    eventCaller(event, 'removeParent', () => {
      event.target.parentNode.parentNode.remove();
      markDirty();
    });
    eventCaller(event, 'removeLeaderBinding', () => {
      event.target.closest('tr').remove();
      markDirty();
    });
    eventCaller(event, 'sound-preview', previewSound);
  });
  document.addEventListener('change', (event) => {
    eventCaller(event, 'customDo', () => {
      const parentRow = event.target.closest('tr');
      const customValue = parentRow.querySelector('.customValue');

      if (NO_VALUE_ACTIONS.includes(event.target.value)) {
        customValue.style.display = 'none';
        customValue.value = 0;
      } else {
        customValue.style.display = 'inline-block';
      }
    });
  });
});
