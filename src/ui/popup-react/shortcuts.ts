// The popup's shortcuts. Fixed for now; the seam for reading from stored
// settings later.
import { formatForDisplay } from '@tanstack/react-hotkeys';

export type SpeedShortcut = {
  base: number;
  key: string;
  shifted: number;
};

const label = (hotkey: string) => formatForDisplay(hotkey);

export const SPEED_SHORTCUTS: SpeedShortcut[] = Array.from({ length: 9 }, (_, i) => ({
  base: i + 1,
  key: String(i + 1),
  shifted: i + 1.5,
}));

export const ADVANCE_KEY = 'ArrowRight';
export const FASTER_KEY = '=';
export const HELP_KEY = '/';
export const PLAY_PAUSE_KEY = 'Space';
export const REWIND_KEY = 'ArrowLeft';
export const SLOWER_KEY = '-';

// Rows shown in the help overlay. Single keys are formatted via the library so
// they render as nice glyphs (␣, ←, →); ranges are summarized by hand.
export const HELP_ROWS = [
  { desc: 'Set speed to 1x – 9x', keys: '1 – 9' },
  { desc: 'Set speed to 1.5x – 9.5x', keys: `${label('Shift+1')} – 9` },
  { desc: 'Slow down', keys: label(SLOWER_KEY) },
  { desc: 'Speed up', keys: label(FASTER_KEY) },
  { desc: 'Play / pause', keys: label(PLAY_PAUSE_KEY) },
  { desc: 'Rewind', keys: label(REWIND_KEY) },
  { desc: 'Advance', keys: label(ADVANCE_KEY) },
  { desc: 'Toggle this help', keys: label(`Shift+${HELP_KEY}`) },
];
