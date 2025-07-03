let speeds;

export function loadSpeeds() {
  const speedsDiv = document.querySelector('#speeds');

  chrome.storage.sync.get('speeds', (storage) => {
    if (!storage.speeds) {
      return;
    }

    speeds = _.sortBy(_.toPairs(storage.speeds), (s) => s[0]);

    speedsDiv.innerHTML = `
<h3 class="text-center">Remembering a total of ${
      Object.entries(storage.speeds).length
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
  const DateTime = luxon.DateTime;

  let out = '';
  speeds.forEach((value, idx) => {
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
    <div>${speed}</div>
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
    <th class="speed">SPEED</th>
    <th class="updated">LAST UPDATED</th>
    <th class="action">ACTION</th>
  </tr>
  ${out}
</table>
`;

  setUpForgetButtons();
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
  speeds = _.filter(speeds, (s) => s[0] !== url);

  displaySpeeds();
  filterSpeeds();
  syncSpeeds();
}

export function cleanUpSpeeds() {
  speeds = _.filter(speeds, (s) => !!s[1].speed);

  displaySpeeds();
  filterSpeeds();
  syncSpeeds();
}

function syncSpeeds() {
  const transformed = _.transform(speeds, (result, value) => (result[value[0]] = value[1]), {});

  chrome.storage.sync.set(
    {
      speeds: transformed,
    },
    () => displaySpeeds()
  );
}
