function toggleSpeeds() {
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

  speedsDiv.classList.toggle('d-none');
}
