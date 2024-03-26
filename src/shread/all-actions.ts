import _ from 'lodash';

type FixSpeed = {
  name: string;
  description: string;
};

const fixSpeedsHelper = (min: number, max: number): FixSpeed[] => {
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
  {} as Record<string, FixSpeed>,
);

export const ACTIONS = {
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
