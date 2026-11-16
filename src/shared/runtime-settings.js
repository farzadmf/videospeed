/**
 * The stored settings the content bridge shows the page script. Every bridge event
 * is readable by page scripts, so only keys the page script reads cross, and
 * `sources` holds only the frame's own site: the whole map lists every site the user
 * set a speed on.
 */
const PAGE_KEYS = [
  'anchorPositioning',
  'audioBoolean',
  'controllerButtonSize',
  'controllerInPlayer',
  'controllerOpacity',
  'exclusiveKeys',
  'flashRing',
  'forceLastSavedSpeed',
  'keyBindings',
  'lastSpeed',
  'leaderBindings',
  'leaderExit',
  'leaderKey',
  'leaderTimeout',
  'logLevel',
  'rememberSpeed',
  'sites',
  'startHidden',
];

/**
 * The stored rememberSpeed, or its default (VSC_DEFAULTS.rememberSpeed) when absent.
 * defaults.js is not imported: it pulls lodash into the bridge bundle.
 */
export function rememberSpeedOn(stored) {
  return stored?.rememberSpeed ?? true;
}

/**
 * @param {Object} stored - Sync storage
 * @param {string} hostname - The frame's hostname, the key of its `sources` entry
 * @returns {Object} The settings the page script may see
 */
export function pageSettings(stored, hostname) {
  const settings = {};
  for (const key of PAGE_KEYS) {
    if (Object.hasOwn(stored, key)) {
      settings[key] = stored[key];
    }
  }

  // The page script ignores lastSpeed while rememberSpeed is off.
  if (!rememberSpeedOn(stored)) {
    delete settings.lastSpeed;
  }

  const ownSource = stored.sources?.[hostname];
  settings.sources = ownSource ? { [hostname]: ownSource } : {};

  return settings;
}

/**
 * The change record the page script may see, in chrome.storage.onChanged format.
 * @returns {Object|null} null when no visible setting changed
 */
export function pageChanges(before, after, hostname) {
  const oldSettings = pageSettings(before, hostname);
  const newSettings = pageSettings(after, hostname);

  const changes = {};
  for (const key of new Set([...Object.keys(oldSettings), ...Object.keys(newSettings)])) {
    if (JSON.stringify(oldSettings[key]) !== JSON.stringify(newSettings[key])) {
      changes[key] = { newValue: newSettings[key], oldValue: oldSettings[key] };
    }
  }

  return Object.keys(changes).length > 0 ? changes : null;
}

/** Sync storage as it stands after `changes`, given the state before them. */
export function applyChanges(stored, changes) {
  const next = { ...stored };
  for (const [key, { newValue }] of Object.entries(changes)) {
    if (newValue === undefined) {
      delete next[key];
    } else {
      next[key] = newValue;
    }
  }

  return next;
}
