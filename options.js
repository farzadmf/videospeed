var regStrip = /^[\r\t\f\v ]+|[\r\t\f\v ]+$/gm;

var tcDefaults = {
  speed: 1.0, // default:
  displayKeyCode: 86, // default: V
  rememberSpeed: false, // default: false
  audioBoolean: false, // default: false
  startHidden: false, // default: false
  forceLastSavedSpeed: false, //default: false
  enabled: true, // default enabled
  controllerOpacity: 0.3, // default: 0.3
  keyBindings: [
    { action: 'display', key: 86, value: 0, force: false, predefined: true }, // V
    { action: 'slower', key: 222, value: 0.1, force: false, predefined: true }, // ;
    { action: 'faster', key: 186, value: 0.1, force: false, predefined: true }, // '
    { action: 'rewind', key: 90, value: 10, force: false, predefined: true }, // Z
    { action: 'advance', key: 88, value: 10, force: false, predefined: true }, // X
    { action: 'reset', key: 82, value: 1, force: false, predefined: true }, // R
    { action: 'fast', key: 71, value: 1.8, force: false, predefined: true }, // G
    { action: 'pause', key: 49, value: 0, force: false, predefined: false }, // 1
    { action: 'fixspeed-1', key: 49, value: 1, force: true, predefined: false }, // 1
    { action: 'fixspeed-2', key: 50, value: 2, force: true, predefined: false }, // 2
    { action: 'fixspeed-3', key: 51, value: 3, force: true, predefined: false }, // 3
    { action: 'fixspeed-4', key: 52, value: 4, force: true, predefined: false }, // 4
    { action: 'fixspeed-5', key: 53, value: 5, force: true, predefined: false }, // 5
    { action: 'fixspeed-6', key: 54, value: 6, force: true, predefined: false }, // 5
  ],
  blacklist: `www.instagram.com
    twitter.com
    imgur.com
    teams.microsoft.com
  `.replace(regStrip, ''),
};

var keyBindings = [];

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

// List of custom actions for which customValue should be disabled
var customActionsNoValues = [
  'pause',
  'muted',
  'mark',
  'jump',
  'display',
  'fixspeed-1',
  'fixspeed-1.5',
  'fixspeed-2',
  'fixspeed-2.5',
  'fixspeed-3',
  'fixspeed-3.5',
  'fixspeed-4',
  'fixspeed-4.5',
  'fixspeed-5',
  'fixspeed-5.5',
  'fixspeed-6',
];

function add_shortcut() {
  var html = `
    <select class="customDo">
      <option value="slower">Decrease speed</option>
      <option value="faster">Increase speed</option>
      <option value="rewind">Rewind</option>
      <option value="advance">Advance</option>
      <option value="reset">Reset speed</option>
      <option value="fast">Preferred speed</option>
      <option value="muted">Mute</option>
      <option value="pause">Pause</option>
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
      <option value="display">Show/hide controller</option>
    </select>
    <input class="customKey" type="text" placeholder="press a key"/>
    <input type="checkbox" name="shift" /><label class="modifier">SHIFT</label>
    <input type="checkbox" name="ctrl" /><label class="modifier">CTRL</label>
    <input class="customValue" type="text" placeholder="value (0.10)"/>
    <select class="customForce">
      <option value="false">Do not disable website key bindings</option>
      <option value="true">Disable website key bindings</option>
    </select>
    <button class="removeParent">X</button>`;
  var div = document.createElement('div');
  div.setAttribute('class', 'row customs');
  div.innerHTML = html;
  var customs_element = document.getElementById('customs');
  customs_element.insertBefore(
    div,
    customs_element.children[customs_element.childElementCount - 1],
  );
}

function createKeyBindings(item) {
  const action = item.querySelector('.customDo').value;
  const key = item.querySelector('.customKey').keyCode;

  const shift = item.querySelector('input[name="shift"]').checked;
  const ctrl = item.querySelector('input[name="ctrl"]').checked;

  const value = Number(item.querySelector('.customValue').value);
  const force = item.querySelector('.customForce').value;
  const predefined = !!item.id; //item.id ? true : false;

  console.log('farzad', item, {
    action,
    key,
    shift,
    ctrl,
    value,
    force,
    predefined,
  });

  keyBindings.push({
    action,
    key,
    shift,
    ctrl,
    value,
    force,
    predefined,
  });
}

// Validates settings before saving
function validate() {
  var valid = true;
  var status = document.getElementById('status');
  var blacklist = document.getElementById('blacklist');

  blacklist.value.split('\n').forEach((match) => {
    match = match.replace(regStrip, '');

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

// Saves options to chrome.storage
function save_options() {
  if (validate() === false) {
    return;
  }
  keyBindings = [];
  Array.from(document.querySelectorAll('.customs')).forEach((item) => createKeyBindings(item)); // Remove added shortcuts

  var rememberSpeed = document.getElementById('rememberSpeed').checked;
  var forceLastSavedSpeed = document.getElementById('forceLastSavedSpeed').checked;
  var audioBoolean = document.getElementById('audioBoolean').checked;
  var enabled = document.getElementById('enabled').checked;
  var startHidden = document.getElementById('startHidden').checked;
  var controllerOpacity = document.getElementById('controllerOpacity').value;
  var blacklist = document.getElementById('blacklist').value;

  chrome.storage.sync.remove([
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
  ]);
  chrome.storage.sync.set(
    {
      rememberSpeed: rememberSpeed,
      forceLastSavedSpeed: forceLastSavedSpeed,
      audioBoolean: audioBoolean,
      enabled: enabled,
      startHidden: startHidden,
      controllerOpacity: controllerOpacity,
      keyBindings: keyBindings,
      blacklist: blacklist.replace(regStrip, ''),
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

// Restores options from chrome.storage
function restore_options() {
  chrome.storage.sync.get(tcDefaults, function (storage) {
    document.getElementById('rememberSpeed').checked = storage.rememberSpeed;
    document.getElementById('forceLastSavedSpeed').checked = storage.forceLastSavedSpeed;
    document.getElementById('audioBoolean').checked = storage.audioBoolean;
    document.getElementById('enabled').checked = storage.enabled;
    document.getElementById('startHidden').checked = storage.startHidden;
    document.getElementById('controllerOpacity').value = storage.controllerOpacity;
    document.getElementById('blacklist').value = storage.blacklist;

    // ensure that there is a "display" binding for upgrades from versions that had it as a separate binding
    if (storage.keyBindings.filter((x) => x.action == 'display').length == 0) {
      storage.keyBindings.push({
        action: 'display',
        value: 0,
        force: false,
        predefined: true,
      });
    }

    for (let i in storage.keyBindings) {
      var item = storage.keyBindings[i];
      console.log('farzad', 'restore_options', item);
      if (item.predefined) {
        //do predefined ones because their value needed for overlay
        // document.querySelector("#" + item["action"] + " .customDo").value = item["action"];
        if (item['action'] == 'display' && typeof item['key'] === 'undefined') {
          item['key'] = storage.displayKeyCode || tcDefaults.displayKeyCode; // V
        }

        if (customActionsNoValues.includes(item['action']))
          document.querySelector(`#${item['action']} .customValue`).style.display = 'none';

        updateCustomShortcutInputText(
          document.querySelector('#' + item['action'] + ' .customKey'),
          item['key'],
        );
        document.querySelector(`#${item['action']} input[name="shift"]`).checked = !!item['shift'];
        document.querySelector(`#${item['action']} input[name="ctrl"]`).checked = item['ctrl'];

        document.querySelector('#' + item['action'] + ' .customValue').value = item['value'];
        document.querySelector('#' + item['action'] + ' .customForce').value = item['force'];
      } else {
        // new ones
        add_shortcut();
        const dom = document.querySelector('.customs:last-of-type');
        console.log('farzad', 'adding shortcut', item['action']);
        dom.querySelector('.customDo').value = item['action'];

        if (customActionsNoValues.includes(item['action'])) {
          dom.querySelector('.customValue').style.display = 'none';
        }

        updateCustomShortcutInputText(dom.querySelector('.customKey'), item['key']);
        dom.querySelector('input[name="shift"]').checked = item['shift'];
        dom.querySelector('input[name="ctrl"]').checked = item['ctrl'];

        dom.querySelector('.customValue').value = item['value'];
        dom.querySelector('.customForce').value = item['force'];
      }
    }
  });
}

function restore_defaults() {
  chrome.storage.sync.set(tcDefaults, function () {
    restore_options();
    document.querySelectorAll('.removeParent').forEach((button) => button.click()); // Remove added shortcuts
    // Update status to let user know options were saved.
    var status = document.getElementById('status');
    status.textContent = 'Default options restored';
    setTimeout(function () {
      status.textContent = '';
    }, 1000);
  });
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

function toggleDisplaySpeeds() {
  const speedsDiv = document.querySelector('#speeds');

  chrome.storage.sync.get('speeds', (storage) => {
    if (!storage.speeds) {
      return;
    }

    const out = Object.entries(storage.speeds).reduce((prev, [key, value]) => {
      return `${prev}
<div style="display: flex;">
  <div style="text-align: right; padding-right: 30px; width: 40%;">${key}</div>
  <div>${value}</div>
</div>
      `;
    }, '');
    speedsDiv.innerHTML = `
<h3 style="text-align: center;">Remembering a total of ${Object.entries(storage.speeds).length} Website speeds</h3>
<hr />
${out}
`;
  });

  speedsDiv.classList.toggle('hidden');
}

document.addEventListener('DOMContentLoaded', function () {
  restore_options();

  document.getElementById('save').addEventListener('click', save_options);
  document.getElementById('add').addEventListener('click', add_shortcut);
  document.getElementById('restore').addEventListener('click', restore_defaults);
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
      event.target.parentNode.remove();
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
