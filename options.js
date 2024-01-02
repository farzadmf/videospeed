// Well, at least on Mac, if I have this at the top, when null-ls wants to save,
// it deletes almost half of the file!!! So all the comments to not have it at the top!!!
const REG_STRIP = /^[\r\t\f\v ]+|[\r\t\f\v ]+$/gm;

// actions {{{
const actions = {
  advance: { name: 'advance', description: 'Advance' },
  display: { name: 'display', description: 'Show/hide controller' },
  fast: { name: 'fast', description: 'Preferred speed' },
  faster: { name: 'faster', description: 'Increase speed' },
  fixspeed_1: { name: 'fixspeed-1', description: '1x speed' },
  fixspeed_1_5: { name: 'fixspeed-1.5', description: '1.5x speed' },
  fixspeed_2: { name: 'fixspeed-2', description: '2x speed' },
  fixspeed_2_5: { name: 'fixspeed-2.5', description: '2.5x speed' },
  fixspeed_3: { name: 'fixspeed-3', description: '3x speed' },
  fixspeed_3_5: { name: 'fixspeed-3.5', description: '3.5x speed' },
  fixspeed_4: { name: 'fixspeed-4', description: '4x speed' },
  fixspeed_4_5: { name: 'fixspeed-4.5', description: '4.5x speed' },
  fixspeed_5: { name: 'fixspeed-5', description: '5x speed' },
  fixspeed_5_5: { name: 'fixspeed-5.5', description: '5.5x speed' },
  fixspeed_6: { name: 'fixspeed-6', description: '6x speed' },
  fixspeed_6_5: { name: 'fixspeed-6.5', description: '6.5x speed' },
  fixspeed_7: { name: 'fixspeed-7', description: '7x speed' },
  fixspeed_7_5: { name: 'fixspeed-7.5', description: '7.5x speed' },
  fixspeed_8: { name: 'fixspeed-8', description: '8x speed' },
  fixspeed_8_5: { name: 'fixspeed-8.5', description: '8.5x speed' },
  fixspeed_9: { name: 'fixspeed-9', description: '9x speed' },
  fixspeed_9_5: { name: 'fixspeed-9.5', description: '9.5x speed' },
  go_start: { name: 'go-start', description: 'Jump to start' },
  jump: { name: 'jump', description: 'Jump to mark' },
  mark: { name: 'mark', description: 'Mark location' },
  muted: { name: 'muted', description: 'Mute' },
  pause: { name: 'pause', description: 'Pause' },
  reset: { name: 'reset', description: 'Reset speed' },
  rewind: { name: 'rewind', description: 'Rewind' },
  slower: { name: 'slower', description: 'Decrease speed' },
  vol_down: { name: 'vol-down', description: 'Decrease volume' },
  vol_up: { name: 'vol-up', description: 'Increase volume' },
};
// }}}

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
    { action: actions.display, force: false, key: 86, predefined: true, value: 0 }, // V
    { action: actions.slower, force: false, key: 222, predefined: true, value: 0.1 }, // ;
    { action: actions.faster, force: false, key: 186, predefined: true, value: 0.1 }, // '
    { action: actions.vol_up, force: true, key: 38, predefined: true, value: 0.05 }, // Up
    { action: actions.vol_down, force: true, key: 40, predefined: true, value: 0.05 }, // Down
    { action: actions.reset, force: false, key: 82, predefined: true, value: 1 }, // R
    { action: actions.fast, force: false, key: 71, predefined: true, value: 1.8 }, // G
    { action: actions.pause, force: false, key: 49, predefined: false, value: 0 }, // 1
    { action: actions.go_start, force: false, key: 48, predefined: false, value: 0 }, // 0
    { action: actions.fixspeed_1, force: true, key: 49, predefined: false, value: 1 }, // 1
    { action: actions.fixspeed_2, force: true, key: 50, predefined: false, value: 2 }, // 2
    { action: actions.fixspeed_3, force: true, key: 51, predefined: false, value: 3 }, // 3
    { action: actions.fixspeed_4, force: true, key: 52, predefined: false, value: 4 }, // 4
    { action: actions.fixspeed_5, force: true, key: 53, predefined: false, value: 5 }, // 5
    { action: actions.fixspeed_6, force: true, key: 54, predefined: false, value: 6 }, // 6
    { action: actions.fixspeed_7, force: true, key: 55, predefined: false, value: 7 }, // 7
    { action: actions.fixspeed_8, force: true, key: 56, predefined: false, value: 8 }, // 8
    { action: actions.fixspeed_9, force: true, key: 57, predefined: false, value: 9 }, // 9
    { action: actions.fixspeed_1_5, force: true, key: 49, predefined: false, value: 1 }, // shift+1
    { action: actions.fixspeed_2_5, force: true, key: 50, predefined: false, value: 2 }, // shift+2
    { action: actions.fixspeed_3_5, force: true, key: 51, predefined: false, value: 3 }, // shift+3
    { action: actions.fixspeed_4_5, force: true, key: 52, predefined: false, value: 4 }, // shift+4
    { action: actions.fixspeed_5_5, force: true, key: 53, predefined: false, value: 5 }, // shift+5
    { action: actions.fixspeed_6_5, force: true, key: 54, predefined: false, value: 6 }, // shift+6
    { action: actions.fixspeed_7_5, force: true, key: 55, predefined: false, value: 7 }, // shift+7
    { action: actions.fixspeed_8_5, force: true, key: 56, predefined: false, value: 8 }, // shift+8
    { action: actions.fixspeed_9_5, force: true, key: 57, predefined: false, value: 9 }, // shift+9
    // "Special" ones that have more things!
    {
      action: actions.rewind,
      force: true,
      key: 37,
      postValue2Text: 'secs )',
      postValueText: '% of duration, ',
      predefined: true,
      preValueText: 'Min of (',
      value2: 5,
      value: 5,
    }, // Left
    {
      action: actions.advance,
      force: true,
      key: 39,
      postValue2Text: 'secs )',
      postValueText: '% of duration, ',
      predefined: true,
      preValueText: 'Min of (',
      value2: 5,
      value: 5,
    }, // Right
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

  return _.find(tcDefaults.keyBindings, (b) => b.action.name === toCompare);
}

var keyBindings = [];

// keyCodeAliases {{{
// Useful sites:
// - http://gcctech.org/csc/javascript/javascript_keycodes.htm
// - https://www.toptal.com/developers/keycode (interactive)
var keyCodeAliases = {
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

// customActionsNoValues {{{
// List of custom actions for which customValue should be disabled
var customActionsNoValues = [
  actions.pause.name,
  actions.go_start.name,
  actions.muted.name,
  actions.mark.name,
  actions.jump.name,
  actions.display.name,
  actions.fixspeed_1.name,
  actions.fixspeed_1_5.name,
  actions.fixspeed_2.name,
  actions.fixspeed_2_5.name,
  actions.fixspeed_3.name,
  actions.fixspeed_3_5.name,
  actions.fixspeed_4.name,
  actions.fixspeed_4_5.name,
  actions.fixspeed_5.name,
  actions.fixspeed_5_5.name,
  actions.fixspeed_6.name,
  actions.fixspeed_6_5.name,
  actions.fixspeed_7.name,
  actions.fixspeed_7_5.name,
  actions.fixspeed_8.name,
  actions.fixspeed_8_5.name,
  actions.fixspeed_9.name,
  actions.fixspeed_9_5.name,
];
// }}}

// add_predefined {{{
function addBinding(item) {
  const { action, predefined, value2 } = item;

  const tcDefault = getTcDefaultBinding(action)

  let valueHtml = `
  <input class="customValue w-50" type="text" placeholder="value (0.10)" />
`;

  if (value2) {
    valueHtml = `
  <span>${item.preValueText || tcDefault.preValueText}</span>
  <input class="customValue w-25" type="text" placeholder="value (${tcDefault.value})" />
  <span>${item.postValueText || tcDefault.postValueText}</span>
  <input class="customValue2 w-25" type="text" placeholder="value (${tcDefault.value2})" />
  <span>${item.postValue2Text || tcDefault.postValue2Text}</span>
`;
  }

  let removeBtn = '';
  if (!predefined) {
    removeBtn = '<button class="removeParent btn btn-danger">X</button>';
  }

  const html = `
<tr id="${action}">
  <td>
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

// add_shortcut {{{
function add_shortcut() {
  const html = `
    <tr>
      <td>
        <select class="customDo form-select">
          <option value="slower">Decrease speed</option>
          <option value="faster">Increase speed</option>
          <option value="rewind">Rewind</option>
          <option value="advance">Advance</option>
          <option value="vol-down">Decrease volume</option>
          <option value="vol-up">Increase volume</option>
          <option value="reset">Reset speed</option>
          <option value="fast">Preferred speed</option>
          <option value="muted">Mute</option>
          <option value="pause">Pause</option>
          <option value="go-start">Jump to video start</option>
          <option value="mark">Set marker</option>
          <option value="jump">Jump to marker</option>
          <option value="fixspeed-1">1x Speed</option>
          <option value="fixspeed-1.5">1.5x Speed</option>
          <option value="fixspeed-2">2x Speed</option>
          <option value="fixspeed-2.5">2.5x Speed</option>
          <option value="fixspeed-3">3x Speed</option>
          <option value="fixspeed-3.5">3.5x Speed</option>
          <option value="fixspeed-4">4x Speed</option>
          <option value="fixspeed-4.5">4.5x Speed</option>
          <option value="fixspeed-5">5x Speed</option>
          <option value="fixspeed-5.5">5.5x Speed</option>
          <option value="fixspeed-6">6x Speed</option>
          <option value="fixspeed-6.5">6.5x Speed</option>
          <option value="fixspeed-7">7x Speed</option>
          <option value="fixspeed-7.5">7.5x Speed</option>
          <option value="fixspeed-8">8x Speed</option>
          <option value="fixspeed-8.5">8.5x Speed</option>
          <option value="fixspeed-9">9x Speed</option>
          <option value="fixspeed-9.5">9.5x Speed</option>
          <option value="display">Show/hide controller</option>
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
        <input class="customKey" type="text" placeholder="press a key"/>
      </td>
      <td>
        <input class="customValue" type="text" placeholder="value (0.10)"/>
      </td>
      <td>
        <select class="customForce form-select">
          <option value="false">Do not disable website key bindings</option>
          <option value="true">Disable website key bindings</option>
        </select>
      </td>
      <td>
        <button class="removeParent btn btn-danger">X</button>
      </td>
    </tr>
`;

  const shortcuts = document.querySelector('#shortcuts tbody');
  shortcuts.insertAdjacentHTML('beforeend', html);
}
// }}}

// createKeyBindings {{{
function createKeyBindings(item) {
  // Ignore rows not containing anything!
  if (!item.querySelector('.customDo')) {
    return;
  }

  const action = item.querySelector('.customDo').value;
  const key = item.querySelector('.customKey').keyCode;

  const shift = item.querySelector('input[name="shift"]').checked;
  const ctrl = item.querySelector('input[name="ctrl"]').checked;

  const value = Number(item.querySelector('.customValue').value);
  const force = JSON.parse(item.querySelector('.customForce').value);
  const predefined = !!item.id; //item.id ? true : false;

  let binding = {
    action,
    key,
    shift,
    ctrl,
    value,
    force,
    predefined,
  };

  const value2El = item.querySelector('.customValue2');
  if (value2El) {
    binding = {
      ...binding,
      value2: Number(value2El.value),
    };
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

    // ensure that there is a "display" binding for upgrades from versions that had it as a separate binding
    if (storage.keyBindings.filter((x) => x.action == 'display').length == 0) {
      storage.keyBindings.push({
        action: 'display',
        value: 0,
        force: false,
        predefined: true,
      });
    }

    const keyBindings = _.sortBy(storage.keyBindings, (b) => b.action.description);

    for (let item of keyBindings) {
      const action = item.action;

      const tcDefault = getTcDefaultBinding(action)

      addBinding(item);

      const dom = document.querySelector('#shortcuts tbody tr:last-of-type');
      dom.querySelector('.customDo').value = action;

      if (customActionsNoValues.includes(action)) {
        dom.querySelector('.customValue').style.display = 'none';
      }

      updateCustomShortcutInputText(dom.querySelector('.customKey'), item.key);
      dom.querySelector('input[name="shift"]').checked = item.shift;
      dom.querySelector('input[name="ctrl"]').checked = item.ctrl;

      dom.querySelector('.customValue').value = item.value;

      const force = JSON.parse(item.force);
      dom.querySelector('.customForce').value = force;

      const colorCls = force ? 'text-warning' : 'text-success';
      dom.querySelector('.customForce').classList.add(colorCls);

      if (item.value2 || tcDefault.value2) {
        const customValue2 = dom.querySelector('.customValue2');
        if (customValue2) customValue2.value = item.value2 || tcDefault.value2;
      }

      /*
      if (item.predefined) {
        add_predefined({ action });
        const dom = document.querySelector('#farzad tbody tr:last-of-type');
        dom.querySelector('.customDo').value = action;

        //do predefined ones because their value needed for overlay
        // document.querySelector("#" + item["action"] + " .customDo").value = item["action"];
        if (action == 'display' && typeof item['key'] === 'undefined') {
          item['key'] = storage.displayKeyCode || tcDefaults.displayKeyCode; // V
        }

        if (customActionsNoValues.includes(action))
          document.querySelector(`#${action} .customValue`).style.display = 'none';

        updateCustomShortcutInputText(
          document.querySelector(`#${action} .customKey`),
          item['key'],
        );
        document.querySelector(`#${action} input[name="shift"]`).checked = !!item['shift'];
        document.querySelector(`#${action} input[name="ctrl"]`).checked = item['ctrl'];

        document.querySelector(`#${action} .customValue`).value = item['value'];
        document.querySelector(`#${action} .customForce`).value = item['force'];

        const customValue2 = document.querySelector(`#${action} .customValue2`);
        if (customValue2) customValue2.value = item['value2'] || tcDefault.value2;
      } else {
        // new ones
        add_shortcut();
        // const dom = document.querySelector('.customs:last-of-type');
        const dom = document.querySelector('#shortcuts tbody tr:last-of-type');
        dom.querySelector('.customDo').value = action;

        if (customActionsNoValues.includes(action)) {
          dom.querySelector('.customValue').style.display = 'none';
        }

        updateCustomShortcutInputText(dom.querySelector('.customKey'), item['key']);
        dom.querySelector('input[name="shift"]').checked = item['shift'];
        dom.querySelector('input[name="ctrl"]').checked = item['ctrl'];

        dom.querySelector('.customValue').value = item['value'];
        dom.querySelector('.customForce').value = item['force'];

        const customValue2 = dom.querySelector('.customValue');
        if (customValue2) customValue2.value = item['value2'];
      }
      */
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

      if (customActionsNoValues.includes(event.target.value)) {
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
