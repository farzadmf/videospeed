import { filter, sortBy, toPairs, transform } from 'lodash-es';
import { DateTime } from 'luxon';

let sources;

export function loadSpeeds() {
  const speedsDiv = document.querySelector('#speeds');

  chrome.storage.sync.get('sources', (storage) => {
    if (!storage.sources) {
      return;
    }

    sources = sortBy(toPairs(storage.sources), (s) => s[0]);

    speedsDiv.innerHTML = `
<h3 class="text-center">Remembering a total of ${
      Object.entries(storage.sources).length
    } Website speeds</h3>
<input class="form-control mb-4" 100%" type="text" id="speeds-filter" placeholder="start typing to filter ..." />
<div id="speed-items"></div>
`;

    displaySpeeds();
    setUpForgetButtons();
    speedsDiv.scrollIntoView();

    document.querySelector('#speeds-filter').addEventListener('input', filterSpeeds);
  });
}

function displaySpeeds() {
  let out = '';
  sources.forEach((value, idx) => {
    const [url, { speed, updated }] = value;

    out = `
${out}
<tr data-speed-row>
  <td>
    <div>${idx + 1}</div>
  </td>
  <td>
    <div>${url}</div>
  </td>
  <td>
    <input class="form-control form-control-sm speed-edit" type="number" step="0.1" min="0.1" max="16" data-speed-url="${url}" value="${speed}" />
  </td>
  <td>
    <div>${DateTime.fromMillis(updated).toFormat('yyyy-MM-dd HH:mm:ss')}</div>
  </td>
  <td>
    <button class="btn btn-danger btn-sm" data-speed-url="${url}">Forget</button>
  </td>
</tr>
`;
  });

  document.querySelector('#speed-items').innerHTML = `
<table id="website-speeds" class="table table-striped table-bordered table-sm">
  <tr>
    <th class="url">Index</th>
    <th class="url">URL</th>
    <th class="speed">
      SPEED
      <span id="speedEditActions" class="ms-1" style="visibility: hidden;">
        <button class="btn btn-sm btn-success" id="saveSpeedEdits" title="Save changes">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16"><path d="M12.736 3.97a.733.733 0 0 1 1.047 0c.286.289.29.756.01 1.05L7.88 12.01a.733.733 0 0 1-1.065.02L3.217 8.384a.757.757 0 0 1 0-1.06.733.733 0 0 1 1.047 0l3.052 3.093 5.4-6.425z"/></svg>
        </button>
        <button class="btn btn-sm btn-secondary" id="resetSpeedEdits" title="Discard changes">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16"><path fill-rule="evenodd" d="M8 3a5 5 0 1 1-4.546 2.914.5.5 0 0 0-.908-.417A6 6 0 1 0 8 2z"/><path d="M8 4.466V.534a.25.25 0 0 0-.41-.192L5.23 2.308a.25.25 0 0 0 0 .384l2.36 1.966A.25.25 0 0 0 8 4.466"/></svg>
        </button>
      </span>
    </th>
    <th class="updated">LAST UPDATED</th>
    <th class="action">ACTION</th>
  </tr>
  ${out}
</table>
`;

  setUpForgetButtons();
  setUpSpeedEditing();
}

function setUpSpeedEditing() {
  document.querySelectorAll('.speed-edit').forEach((input) => {
    input.addEventListener('change', (event) => {
      const url = event.target.getAttribute('data-speed-url');
      const newSpeed = parseFloat(event.target.value);
      if (isNaN(newSpeed) || newSpeed <= 0) {return;}

      const entry = sources.find((s) => s[0] === url);
      if (entry) {
        entry[1].speed = newSpeed;
        showSpeedEditActions(true);
      }
    });
  });

  document.getElementById('saveSpeedEdits').addEventListener('click', () => {
    syncSpeeds();
    showSpeedEditActions(false);
  });

  document.getElementById('resetSpeedEdits').addEventListener('click', () => {
    loadSpeeds();
  });
}

function showSpeedEditActions(visible) {
  document.getElementById('speedEditActions').style.visibility = visible ? 'visible' : 'hidden';
}

function filterSpeeds() {
  const filterTerm = document.querySelector('#speeds-filter').value;

  const all = Array.from(document.querySelectorAll('tr[data-speed-row]'));
  all.forEach((el) => el.classList.add('d-none'));

  // When filterTerm is empty, nothing matches
  const matching = filterTerm
    ? Array.from(
        document.querySelectorAll(`tr[data-speed-row]:has(button[data-speed-url*="${filterTerm}"])`)
      )
    : all;
  matching.forEach((el) => el.classList.remove('d-none'));
}

function setUpForgetButtons() {
  document.querySelectorAll('button[data-speed-url]').forEach((b) => {
    b.addEventListener('click', forgetSpeed);
  });
}

function forgetSpeed(event) {
  const url = event.target.getAttribute('data-speed-url');
  sources = filter(sources, (s) => s[0] !== url);

  displaySpeeds();
  filterSpeeds();
  syncSpeeds();
}

export function cleanUpSpeeds() {
  sources = filter(sources, (s) => !!s[1].speed);

  displaySpeeds();
  filterSpeeds();
  syncSpeeds();
}

function syncSpeeds() {
  const transformed = transform(sources, (result, value) => (result[value[0]] = value[1]), {});

  chrome.storage.sync.set(
    {
      sources: transformed,
    },
    () => displaySpeeds()
  );
}
