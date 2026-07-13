import { BLACKLISTED_CODES, BLACKLISTED_KEYS, KEYS } from '@key-codes';
import type { KeyboardEvent } from 'react';

// Resolved once; used to label a physical code per the active keyboard layout.
let layoutMap: Map<string, string> | null = null;

export const layoutMapReady = (async function initLayoutMap() {
  try {
    const kb = (navigator as Navigator & { keyboard?: { getLayoutMap?: () => Promise<Map<string, string>> } }).keyboard;
    if (kb?.getLayoutMap) {
      layoutMap = await kb.getLayoutMap();
    }
  } catch {
    // getLayoutMap unavailable — the fallback chain in displayLabelForCode handles it.
  }
})();

// Numpad keys bypass the layout map because it collapses e.g. Enter and
// NumpadEnter to the same label.
export function displayLabelForCode(code: string): string {
  if (!code) {
    return '';
  }

  const strip = (s: string) => s.replace(/^(Key|Digit)/, '');
  const fallback = () => strip((KEYS as Record<string, string>)[code] || code);

  return code.startsWith('Numpad') ? fallback() : layoutMap?.get(code) || fallback();
}

export type Captured = { code: string; alt: boolean; shift: boolean; ctrl: boolean };

// Interprets a keydown for a capture input. Returns:
//   null      — ignore (a bare modifier or blacklisted key)
//   'clear'   — Escape: clear the binding
//   Captured  — a recorded key + the modifiers held with it
export function captureKey(event: KeyboardEvent): Captured | 'clear' | null {
  const { altKey, code, ctrlKey, key, shiftKey } = event;

  if (key === 'Escape') {
    return 'clear';
  }

  if (BLACKLISTED_KEYS.includes(key) || BLACKLISTED_CODES.includes(code)) {
    return null;
  }

  return { code, alt: altKey, shift: shiftKey, ctrl: ctrlKey };
}
