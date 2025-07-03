import { NO_VALUE_ACTIONS } from '../../shared/actions.js';
import {
  addBinding,
  inputFilterNumbersOnly,
  inputFocus,
  inputBlur,
  recordKeyPress,
} from './helpers/bindings.js';
import { cleanUpSpeeds, loadSpeeds } from './helpers/toggle-speeds.js';
import { restoreDefaults, restoreOptions } from './helpers/restore.js';
import { saveOptions } from './helpers/save.js';

function show_experimental() {
  document
    .querySelectorAll('.customForce')
    .forEach((item) => (item.style.display = 'inline-block'));
}

function forgetAll() {
  chrome.storage.sync.remove(['speeds']);
  const forgetStatus = document.querySelector('#forgetStatus');
  forgetStatus.classList.toggle('d-none');
  setTimeout(() => forgetStatus.classList.toggle('d-none'), 1500);
}

document.addEventListener('DOMContentLoaded', () => {
  restoreOptions();
  loadSpeeds();

  document.querySelector('#save').addEventListener('click', saveOptions);
  document.querySelector('#add').addEventListener('click', addBinding);
  document.querySelector('#restore').addEventListener('click', restoreDefaults);
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
  });
  document.addEventListener('click', (event) => {
    eventCaller(event, 'removeParent', () => {
      event.target.parentNode.parentNode.remove();
    });
  });
  document.addEventListener('change', (event) => {
    eventCaller(event, 'customDo', () => {
      const parent = event.target.parentNode;
      const customValue = parent.querySelector('.customValue');

      if (NO_VALUE_ACTIONS.includes(event.target.value)) {
        customValue.style.display = 'none';
        customValue.value = 0;
      } else {
        customValue.style.display = 'inline-block';
      }
    });
  });
});
