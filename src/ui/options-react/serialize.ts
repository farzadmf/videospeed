import { REG_STRIP } from '@shared/constants';

import { KeyBinding, LeaderBinding, Settings } from './use-options';

// Mirrors the vanilla save.js: strip trailing/leading whitespace per line so the
// stored blacklist matches what the content script expects.
export function normalizeBlacklist(blacklist: string[]): string[] {
  return blacklist.map((value) => value.replace(REG_STRIP, ''));
}

// Validates blacklist regex lines the same way the vanilla validate.js did.
// Returns an error message, or null when valid.
export function validateBlacklist(blacklist: string[]): string | null {
  for (const raw of blacklist) {
    const match = raw.replace(REG_STRIP, '');
    if (!match.startsWith('/')) {
      continue;
    }

    try {
      const parts = match.split('/');
      if (parts.length < 3) {
        throw new Error('invalid regex');
      }
      const flags = parts.pop() as string;
      const regex = parts.slice(1).join('/');
      new RegExp(regex, flags);
    } catch {
      return `Invalid blacklist regex: "${match}". Try wrapping it in forward slashes.`;
    }
  }

  return null;
}

// Drops falsey modifiers and default-equal values so stored bindings match the
// shape the vanilla page produced (booleans absent when false, value omitted
// when it equals the action default).
function normalizeBinding<T extends KeyBinding | LeaderBinding>(binding: T): T {
  const out = { action: binding.action, code: binding.code } as T;

  if (binding.alt) {
    out.alt = true;
  }
  if (binding.shift) {
    out.shift = true;
  }
  if (binding.ctrl) {
    out.ctrl = true;
  }

  return out;
}

function normalizeKeyBinding(binding: KeyBinding): KeyBinding {
  const out = normalizeBinding(binding);

  if (binding.predefined) {
    out.predefined = true;
  }

  if (binding.value !== undefined && binding.value !== binding.action.value) {
    out.value = binding.value;
  }
  if (binding.value2 !== undefined && binding.value2 !== binding.action.value2) {
    out.value2 = binding.value2;
  }

  return out;
}

export function serialize(draft: Settings): Settings {
  return {
    ...draft,
    blacklist: normalizeBlacklist(draft.blacklist),
    keyBindings: draft.keyBindings.map(normalizeKeyBinding),
    leaderBindings: draft.leaderBindings.map((b) => normalizeBinding(b)),
  };
}
