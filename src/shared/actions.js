// This is used both in options page (normal window._) and extension context (being injected
// through injector.js, preserve/restore underscore etc.).
const _ = window.VSC?._ || window._;

export const ACTIONS = {
  fixspeed_10: { name: 'fixspeed_10', description: '1.0x speed' },
  fixspeed_20: { name: 'fixspeed_20', description: '2.0x speed' },
  fixspeed_30: { name: 'fixspeed_30', description: '3.0x speed' },
  fixspeed_40: { name: 'fixspeed_40', description: '4.0x speed' },
  fixspeed_50: { name: 'fixspeed_50', description: '5.0x speed' },
  fixspeed_60: { name: 'fixspeed_60', description: '6.0x speed' },
  fixspeed_70: { name: 'fixspeed_70', description: '7.0x speed' },
  fixspeed_80: { name: 'fixspeed_80', description: '8.0x speed' },
  fixspeed_90: { name: 'fixspeed_90', description: '9.0x speed' },
  fixspeed_15: { name: 'fixspeed_15', description: '1.5x speed' },
  fixspeed_25: { name: 'fixspeed_25', description: '2.5x speed' },
  fixspeed_35: { name: 'fixspeed_35', description: '3.5x speed' },
  fixspeed_45: { name: 'fixspeed_45', description: '4.5x speed' },
  fixspeed_55: { name: 'fixspeed_55', description: '5.5x speed' },
  fixspeed_65: { name: 'fixspeed_65', description: '6.5x speed' },
  fixspeed_75: { name: 'fixspeed_75', description: '7.5x speed' },
  fixspeed_85: { name: 'fixspeed_85', description: '8.5x speed' },
  fixspeed_95: { name: 'fixspeed_95', description: '9.5x speed' },
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
  go_start: { name: 'go_start', description: 'Jump to start' },
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
  vol_down: { name: 'vol_down', description: 'Decrease volume', value: 0.05 },
  vol_up: { name: 'vol_up', description: 'Increase volume', value: 0.05 },
};

export const NO_VALUE_ACTIONS = _.keys(_.pickBy(ACTIONS, (value) => value.value === undefined));

export const actionByName = (actionName) => _.pick(ACTIONS, [actionName])[actionName];

export const ACTION_OPTIONS = _.map(
  ACTIONS,
  ({ name, description }) => `<option value="${name}">${description}</option>`
);

export const ALLOWED_ACTION_OPTIONS = () => {
  const usedOptions = _.map(
    document.querySelectorAll('#shortcuts td:first-child select'),
    (s) => s.value
  );

  const filtered = _.filter(ACTIONS, ({ name }) => usedOptions.indexOf(name) === -1);

  return _.map(
    filtered,
    ({ name, description }) => `<option value="${name}">${description}</option>`
  );
};
