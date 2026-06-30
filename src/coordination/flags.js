export const COORD_ENABLED = true;

export const LEADER_ENABLED = true;

// When false, leader mode does not preventDefault/stopImmediatePropagation,
// so keystrokes still reach the page.
export const LEADER_SWALLOW = false;

export const LEADER_TRIGGER_KEY = 'q';

// Bare key -> action name.
export const LEADER_BINDINGS = {
  v: 'display',
  a: 'faster',
  s: 'slower',
  d: 'reset',
  f: 'fast',
};

// Auto-exit after idle so we can't get stuck in a swallow-everything mode.
export const LEADER_TIMEOUT_MS = 2000;
