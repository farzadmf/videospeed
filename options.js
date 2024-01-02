// Well, at least on Mac, if I have this at the top, when null-ls wants to save,
// it deletes almost half of the file!!! So all the comments to not have it at the top!!!
const REG_STRIP = /^[\r\t\f\v ]+|[\r\t\f\v ]+$/gm;

// actions {{{
const fixSpeedsHelper = (min, max) => {
  return _.range(min, max + 1, 0.5).map((val) => {
    const value = val.toFixed(1);

    return {
      name: `fixspeed-${value}`,
      description: `${value}x speed`,
    };
  });
};

const fixSpeeds = _.transform(
  fixSpeedsHelper(1, 9),
  (result, action) => (result[action.name] = action),
  {},
);

const actions = {
  ...fixSpeeds,
  advance: {
    description: 'Advance',
    name: 'advance',
    postValue2Text: 'secs )',
    postValueText: '% of duration, ',
    predefined: true,
    preValueText: 'Min of (',
    value2: 5,
    value: 5,
  },
  display: { name: 'display', description: 'Show/hide controller' },
  fast: { name: 'fast', description: 'Preferred speed', value: 1.0 },
  faster: { name: 'faster', description: 'Increase speed', value: 0.1 },
  ['go-start']: { name: 'go-start', description: 'Jump to start' },
  jump: { name: 'jump', description: 'Jump to mark' },
  mark: { name: 'mark', description: 'Mark location' },
  muted: { name: 'muted', description: 'Mute' },
  pause: { name: 'pause', description: 'Pause' },
  reset: { name: 'reset', description: 'Reset speed', value: 1.0 },
  rewind: {
    description: 'Rewind',
    name: 'rewind',
    postValue2Text: 'secs )',
    postValueText: '% of duration, ',
    predefined: true,
    preValueText: 'Min of (',
    value2: 5,
    value: 5,
  },
  slower: { name: 'slower', description: 'Decrease speed', value: 0.1 },
  ['vol-down']: { name: 'vol-down', description: 'Decrease volume', value: 0.05 },
  ['vol-up']: { name: 'vol-up', description: 'Increase volume', value: 0.05 },
};
// }}}

const noValueActions = _.keys(_.pickBy(actions, (value, _) => value.value === undefined));

// tdDefaults {{{
var tcDefaults = {
  blacklist: `www.instagram.com
    twitter.com
    imgur.com
    teams.microsoft.com
  `.replace(REG_STRIP, ''),
  audioBoolean: false, // default: false
  controllerOpacity: 0.6, // default: 0.6
  displayKeyCode: 86, // default: V
  enabled: true, // default enabled
  forceLastSavedSpeed: false, //default: false
  keyBindings: [
    { action: actions.display, force: false, key: 86, predefined: true }, // V
    { action: actions.fast, force: false, key: 71, predefined: true }, // G
    { action: actions.faster, force: false, key: 186, predefined: true }, // '
    { action: actions['fixspeed-1.0'], force: true, key: 49, predefined: false }, // 1
    { action: actions['fixspeed-1.5'], force: true, key: 49, predefined: false, shift: true }, // shift+1
    { action: actions['fixspeed-2.0'], force: true, key: 50, predefined: false }, // 2
    { action: actions['fixspeed-2.5'], force: true, key: 50, predefined: false, shift: true }, // shift+2
    { action: actions['fixspeed-3.0'], force: true, key: 51, predefined: false }, // 3
    { action: actions['fixspeed-3.5'], force: true, key: 51, predefined: false, shift: true }, // shift+3
    { action: actions['fixspeed-4.0'], force: true, key: 52, predefined: false }, // 4
    { action: actions['fixspeed-4.5'], force: true, key: 52, predefined: false, shift: true }, // shift+4
    { action: actions['fixspeed-5.0'], force: true, key: 53, predefined: false }, // 5
    { action: actions['fixspeed-5.5'], force: true, key: 53, predefined: false, shift: true }, // shift+5
    { action: actions['fixspeed-6.0'], force: true, key: 54, predefined: false }, // 6
    { action: actions['fixspeed-6.5'], force: true, key: 54, predefined: false, shift: true }, // shift+6
    { action: actions['fixspeed-7.0'], force: true, key: 55, predefined: false }, // 7
    { action: actions['fixspeed-7.5'], force: true, key: 55, predefined: false, shift: true }, // shift+7
    { action: actions['fixspeed-8.0'], force: true, key: 56, predefined: false }, // 8
    { action: actions['fixspeed-8.5'], force: true, key: 56, predefined: false, shift: true }, // shift+8
    { action: actions['fixspeed-9.0'], force: true, key: 57, predefined: false }, // 9
    { action: actions['fixspeed-9.5'], force: true, key: 57, predefined: false, shift: true }, // shift+9
    { action: actions['go-start'], force: false, key: 48, predefined: false }, // 0
    { action: actions.pause, force: false, key: 49, predefined: false }, // 1
    { action: actions.reset, force: false, key: 82, predefined: true }, // R
    { action: actions.slower, force: false, key: 222, predefined: true }, // ;
    { action: actions['vol-down'], force: true, key: 40, predefined: true }, // Down
    { action: actions['vol-up'], force: true, key: 38, predefined: true }, // Up
    { action: actions.rewind, force: true, key: 37, predefined: true }, // Left
    { action: actions.advance, force: true, key: 39, predefined: true }, // Right
  ],
  logLevel: 3, // default: 3
  rememberSpeed: false, // default: false
  speed: 1.0, // default: 1.0
  startHidden: false, // default: false
};
// }}}

const bindingOptions = _.map(
  actions,
  ({ name, description }) => `<option value="${name}">${description}</option>`,
);

const getTcDefaultBinding = (action) => {
  const toCompare = typeof action === 'string' ? action : action.name;

  return _.find(tcDefaults.keyBindings, (b) => {
    if (!toCompare.includes('fixspeed')) {
      return b.action.name === toCompare;
    }

    const speedVal = Number(toCompare.split('-')[1]).toFixed(1);
    return b.action.name === `fixspeed-${speedVal}`;
  });
};

const getActionName = (action) => {
  const toCompare = typeof action === 'string' ? action : action.name;

  if (!toCompare.includes('fixspeed')) {
    return toCompare;
  }

  const speedVal = Number(toCompare.split('-')[1]).toFixed(1);
  return `fixspeed-${speedVal}`;
}

let keyBindings = [];

// keyCodeAliases {{{
// Useful sites:
// - http://gcctech.org/csc/javascript/javascript_keycodes.htm
// - https://www.toptal.com/developers/keycode (interactive)
const keyCodeAliases = {
  0: 'null',
  null: 'null',
  undefined: 'null',
  32: 'Space',
  37: 'Left',
  38: 'Up',
  39: 'Right',
  40: 'Down',
  48: '0',
  49: '1',
  50: '2',
  51: '3',
  52: '4',
  53: '5',
  54: '6',
  55: '7',
  56: '8',
  57: '9',
  96: 'Num 0',
  97: 'Num 1',
  98: 'Num 2',
  99: 'Num 3',
  100: 'Num 4',
  101: 'Num 5',
  102: 'Num 6',
  103: 'Num 7',
  104: 'Num 8',
  105: 'Num 9',
  106: 'Num *',
  107: 'Num +',
  109: 'Num -',
  110: 'Num .',
  111: 'Num /',
  112: 'F1',
  113: 'F2',
  114: 'F3',
  115: 'F4',
  116: 'F5',
  117: 'F6',
  118: 'F7',
  119: 'F8',
  120: 'F9',
  121: 'F10',
  122: 'F11',
  123: 'F12',
  186: ';',
  188: '<',
  189: '-',
  187: '+',
  190: '.',
  191: '/',
  192: '~',
  219: '[',
  220: '\\',
  221: ']',
  222: "'",
};
// }}}

// recordKeyPress {{{
function recordKeyPress(e) {
  if (
    (e.keyCode >= 48 && e.keyCode <= 57) || // Numbers 0-9
    (e.keyCode >= 65 && e.keyCode <= 90) || // Letters A-Z
    keyCodeAliases[e.keyCode] // Other character keys
  ) {
    console.log(
      'farzad',
      'recordKeyPress',
      'keyCode',
      e.keyCode,
      'ctrlKey',
      e.ctrlKey,
      'shiftKey',
      e.shiftKey,
    );
    e.target.value = keyCodeAliases[e.keyCode] || String.fromCharCode(e.keyCode);

    e.target.keyCode = e.keyCode;
    e.target.shift = e.shiftKey;
    e.target.ctrl = e.ctrlKey;

    const shift = e.target.nextElementSibling;
    const ctrl = shift.nextElementSibling.nextElementSibling;
    shift.checked = e.shiftKey;
    ctrl.checked = e.ctrlKey;

    e.preventDefault();
    e.stopPropagation();
  } else if (e.keyCode === 8) {
    // Clear input when backspace pressed
    e.target.value = '';
  } else if (e.keyCode === 27) {
    // When esc clicked, clear input
    e.target.value = 'null';
    e.target.keyCode = null;
  }
}
// }}}

// misc functions (input element manipulation etc.) {{{
function inputFilterNumbersOnly(e) {
  var char = String.fromCharCode(e.keyCode);
  if (!/[\d\.]$/.test(char) || !/^\d+(\.\d*)?$/.test(e.target.value + char)) {
    e.preventDefault();
    e.stopPropagation();
  }
}

function inputFocus(e) {
  e.target.value = '';
}

function inputBlur(e) {
  e.target.value = keyCodeAliases[e.target.keyCode] || String.fromCharCode(e.target.keyCode);
}

function updateShortcutInputText(inputId, keyCode) {
  document.getElementById(inputId).value = keyCodeAliases[keyCode] || String.fromCharCode(keyCode);
  document.getElementById(inputId).keyCode = keyCode;
}

function updateCustomShortcutInputText(inputItem, keyCode) {
  inputItem.value = keyCodeAliases[keyCode] || String.fromCharCode(keyCode);
  inputItem.keyCode = keyCode;
}

function show_experimental() {
  document
    .querySelectorAll('.customForce')
    .forEach((item) => (item.style.display = 'inline-block'));
}

function forgetAll() {
  chrome.storage.sync.remove(['speeds']);
  forgetStatus = document.querySelector('#forgetStatus');
  forgetStatus.classList.toggle('hidden');
  setTimeout(() => forgetStatus.classList.toggle('hidden'), 1500);
}
// }}}

// add_predefined {{{
function addBinding(item) {
  const { action, predefined } = item;
  const value2 = item.value2 || action.value2;

  const tcDefault = getTcDefaultBinding(action);

  let valueHtml = `
  <input class="customValue w-50" type="text" placeholder="value (0.10)" />
`;

  if (value2) {
    valueHtml = `
  <span>${tcDefault.action.preValueText}</span>
  <input class="customValue" style="width: 10%;" type="text" placeholder="value (${tcDefault.action.value})" />
  <span>${tcDefault.action.postValueText}</span>
  <input class="customValue2" style="width: 10%;" type="text" placeholder="value (${tcDefault.action.value2})" />
  <span>${tcDefault.action.postValue2Text}</span>
`;
  }

  let removeBtn = '';
  let predefinedInput = '';
  if (!predefined) {
    removeBtn = '<button class="removeParent btn btn-danger">X</button>';
  } else {
    predefinedInput = '<input type="hidden" class="predefined" />'
  }

  const html = `
<tr id="${action}">
  <td>
    ${predefinedInput}
    <select class="customDo form-select">
      ${bindingOptions.join('\n')}
    </select>
  </td>
  <td>
    <div class="form-check">
      <input type="checkbox" class="form-check-input" name="shift" /><label class="modifier form-check-label">SHIFT</label>
    </div>
    <div class="form-check">
      <input type="checkbox" class="form-check-input" name="ctrl" /><label class="modifier form-check-label">CTRL</label>
    </div>
  </td>
  <td>
    <input class="customKey w-50" type="text" value="" placeholder="press a key" class="form-control" />
  </td>
  <td>
    ${valueHtml}
  </td>
  <td>
    <select class="customForce form-select">
      <option value="false">Do not disable website key bindings</option>
      <option value="true">Disable website key bindings</option>
    </select>
  </td>
  <td>${removeBtn}</td>
</tr>
`;
  const shortcuts = document.querySelector('#shortcuts tbody');
  shortcuts.insertAdjacentHTML('beforeend', html);

  const forceSelect = shortcuts.querySelector('tr:last-of-type .customForce');
  forceSelect.addEventListener('change', (event) => {
    const target = event.target;
    const value = JSON.parse(target.value);

    target.classList.remove('text-warning');
    target.classList.remove('text-success');

    const colorCls = value ? 'text-warning' : 'text-success';
    target.classList.add(colorCls);
  });
}

// }}}

// createKeyBindings {{{
function createKeyBindings(item) {
  // Ignore rows not containing anything!
  if (!item.querySelector('.customDo')) {
    return;
  }

  const actionName = item.querySelector('.customDo').value;
  const action = _.pick(actions, [actionName])[actionName];
  const tcDefault = getTcDefaultBinding(action);

  const key = item.querySelector('.customKey').keyCode;

  const shift = item.querySelector('input[name="shift"]').checked;
  const ctrl = item.querySelector('input[name="ctrl"]').checked;

  const force = JSON.parse(item.querySelector('.customForce').value);
  const predefined = !!item.querySelector('.predefined');

  let binding = {
    action,
    key,
    force,
    predefined,
  };

  if (shift) { binding = {...binding, shift }};
  if (ctrl) { binding = {...binding, ctrl }};

  if (!noValueActions.includes(actionName)) {
    const value = Number(item.querySelector('.customValue').value);
    if (value !== tcDefault.action.value) {
      binding = {...binding, value };
    }

    const value2El = item.querySelector('.customValue2');
    if (value2El) {
      const value2 = Number(value2El.value);
      if (value2 !== tcDefault.action.value2) {
        binding = {...binding, value2 };
      }
    }
  }

  keyBindings.push(binding);
}
// }}}

// validate {{{
// Validates settings before saving
function validate() {
  var valid = true;
  var status = document.getElementById('status');
  var blacklist = document.getElementById('blacklist');

  blacklist.value.split('\n').forEach((match) => {
    match = match.replace(REG_STRIP, '');

    if (match.startsWith('/')) {
      try {
        var parts = match.split('/');

        if (parts.length < 3) throw 'invalid regex';

        var flags = parts.pop();
        var regex = parts.slice(1).join('/');

        var regexp = new RegExp(regex, flags);
      } catch (err) {
        status.textContent =
          'Error: Invalid blacklist regex: "' +
          match +
          '". Unable to save. Try wrapping it in foward slashes.';
        valid = false;
        return;
      }
    }
  });
  return valid;
}
// }}}

// saveOptions {{{
// Saves options to chrome.storage
function saveOptions() {
  if (!validate()) {
    return;
  }
  keyBindings = [];

  Array.from(document.querySelectorAll('#shortcuts tr')).forEach((item) => createKeyBindings(item)); // Remove added shortcuts

  const audioBoolean = document.getElementById('audioBoolean').checked;
  const blacklist = document.getElementById('blacklist').value;
  const controllerOpacity = document.getElementById('controllerOpacity').value;
  const enabled = document.getElementById('enabled').checked;
  const forceLastSavedSpeed = document.getElementById('forceLastSavedSpeed').checked;
  const logLevel = document.getElementById('logLevel').value;
  const rememberSpeed = document.getElementById('rememberSpeed').checked;
  const startHidden = document.getElementById('startHidden').checked;

  chrome.storage.sync.remove([
    'advanceKeyCode',
    'advanceTime',
    'defaultLogLevel',
    'fasterKeyCode',
    'fastKeyCode',
    'fastSpeed',
    'resetKeyCode',
    'resetSpeed',
    'rewindKeyCode',
    'rewindTime',
    'slowerKeyCode',
    'speedStep',
  ]);
  chrome.storage.sync.set(
    {
      audioBoolean,
      blacklist: blacklist.replace(REG_STRIP, ''),
      controllerOpacity,
      enabled,
      forceLastSavedSpeed,
      keyBindings,
      logLevel,
      rememberSpeed,
      startHidden,
    },
    function () {
      // Update status to let user know options were saved.
      var status = document.getElementById('status');
      status.textContent = 'Options saved';
      setTimeout(function () {
        status.textContent = '';
      }, 1000);
    },
  );
}
// }}}

// restoreOptions {{{
// Restores options from chrome.storage
function restoreOptions() {
  chrome.storage.sync.get(tcDefaults, function (storage) {
    document.getElementById('audioBoolean').checked = storage.audioBoolean;
    document.getElementById('blacklist').value = storage.blacklist;
    document.getElementById('controllerOpacity').value = storage.controllerOpacity;
    document.getElementById('logLevel').value = storage.logLevel;
    document.getElementById('enabled').checked = storage.enabled;
    document.getElementById('forceLastSavedSpeed').checked = storage.forceLastSavedSpeed;
    document.getElementById('rememberSpeed').checked = storage.rememberSpeed;
    document.getElementById('startHidden').checked = storage.startHidden;

    const keyBindings = _.sortBy(storage.keyBindings, (b) => b.action.description);

    for (let item of keyBindings) {
      const actionName = getActionName(item.action);
      const tcDefault = getTcDefaultBinding(actionName);

      addBinding(item);

      const dom = document.querySelector('#shortcuts tbody tr:last-of-type');
      dom.querySelector('.customDo').value = actionName;

      if (noValueActions.includes(actionName)) {
        dom.querySelector('.customValue').style.display = 'none';
      }

      updateCustomShortcutInputText(dom.querySelector('.customKey'), item.key);
      dom.querySelector('input[name="shift"]').checked = !!item.shift;
      dom.querySelector('input[name="ctrl"]').checked = !!item.ctrl;

      dom.querySelector('.customValue').value = item.value || tcDefault.action.value;

      const force = JSON.parse(item.force);
      dom.querySelector('.customForce').value = force;

      const colorCls = force ? 'text-warning' : 'text-success';
      dom.querySelector('.customForce').classList.add(colorCls);

      const customValue2 = dom.querySelector('.customValue2');
      if (customValue2) customValue2.value = item.value2 || tcDefault.action.value2;
    }

    const total = _.keys(actions).length;
    const used = document.querySelectorAll('#shortcuts tbody tr').length;

    if (used < total) {
      document.querySelector('#add').style.display = '';
    }
  });
}
// }}}

// restoreDefaults {{{
function restoreDefaults() {
  chrome.storage.sync.set(tcDefaults, function () {
    restoreOptions();
    document.querySelectorAll('.removeParent').forEach((button) => button.click()); // Remove added shortcuts
    // Update status to let user know options were saved.
    var status = document.getElementById('status');
    status.textContent = 'Default options restored';
    setTimeout(function () {
      status.textContent = '';
    }, 1000);
  });
}
// }}}

// toggleDisplaySpeeds {{{
function toggleDisplaySpeeds() {
  const speedsDiv = document.querySelector('#speeds');

  chrome.storage.sync.get('speeds', (storage) => {
    if (!storage.speeds) {
      return;
    }

    const speeds = _.sortBy(_.toPairs(storage.speeds), (s) => s[0]);
    const DateTime = luxon.DateTime;

    const display = (s) => {
      const out = _.map(s, (value) => {
        const [url, { speed, updated }] = value;
        return `
<tr>
  <td class="url">
    <div>${url}</div>
  </td class="speed">
  <td>
    <div>${speed}</div>
  </td>
  <td class="updated">
    <div>${DateTime.fromMillis(updated).toFormat('yyyy-MM-dd HH:mm:ss')}</div>
  </td>
  <td class="action">
    <button data-speed-url="${url}">DELETE</button>
  </td>
</tr>
`;
      }).join('');

      document.querySelector('#speed-items').innerHTML = `
<table id="website-speeds">
  <tr>
    <th class="url">URL</th>
    <th class="speed">SPEED</th>
    <th class="updated">LAST UPDATED</th>
    <th class="action">ACTION</th>
  </tr>
  ${out}
</table>
`;
    };

    speedsDiv.innerHTML = `
<h3 style="text-align: center;">Remembering a total of ${
      Object.entries(storage.speeds).length
    } Website speeds</h3>
<hr />
<input style="width: 100%" type="text" id="speeds-filter" placeholder="start typing to filter ..." />
<hr />
<div id="speed-items"></div>
`;

    display(speeds);
    speedsDiv.scrollIntoView();

    document.querySelector('#speeds-filter').addEventListener('input', () => {
      const value = document.querySelector('#speeds-filter').value;
      display(_.filter(speeds, (s) => s[0].toLowerCase().includes(value)));
    });

    document.querySelectorAll('button[data-speed-url]').forEach((b) => {
      b.addEventListener('click', (event) => {
        const url = event.target.getAttribute('data-speed-url');
        const filteredSpeeds = _.filter(speeds, (s) => s[0] !== url);
        const transformed = _.transform(
          filteredSpeeds,
          (result, value) => (result[value[0]] = value[1]),
          {},
        );
        chrome.storage.sync.set(
          {
            speeds: transformed,
          },
          () => display(filteredSpeeds),
        );
      });
    });
  });

  speedsDiv.classList.toggle('hidden');
}
// }}}

// DOMContentLoaded; entry point basically {{{
document.addEventListener('DOMContentLoaded', function () {
  restoreOptions();

  document.getElementById('save').addEventListener('click', saveOptions);
  document.getElementById('add').addEventListener('click', addBinding);
  document.getElementById('restore').addEventListener('click', restoreDefaults);
  document.getElementById('experimental').addEventListener('click', show_experimental);
  document.getElementById('forgetAll').addEventListener('click', forgetAll);
  document.getElementById('toggleDisplaySpeeds').addEventListener('click', toggleDisplaySpeeds);

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
    eventCaller(event, 'removeParent', function () {
      event.target.parentNode.parentNode.remove();
    });
  });
  document.addEventListener('change', (event) => {
    eventCaller(event, 'customDo', function () {
      const parent = event.target.parentNode;
      const customValue = parent.querySelector('.customValue');

      if (noValueActions.includes(event.target.value)) {
        customValue.style.display = 'none';
        customValue.value = 0;
      } else {
        customValue.style.display = 'inline-block';
      }
    });
  });
});
// }}}

// vim: foldmethod=marker
