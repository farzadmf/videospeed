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
};

let keyBindings = [];

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
  e.target.value = KEY_CODES[e.target.keyCode] || String.fromCharCode(e.target.keyCode);
}

function updateShortcutInputText(inputId, keyCode) {
  document.getElementById(inputId).value = KEY_CODES[keyCode] || String.fromCharCode(keyCode);
  document.getElementById(inputId).keyCode = keyCode;
}

function updateCustomShortcutInputText(inputItem, keyCode) {
  inputItem.value = KEY_CODES[keyCode] || String.fromCharCode(keyCode);
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

      if (NO_VALUE_ACTIONS.includes(event.target.value)) {
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
