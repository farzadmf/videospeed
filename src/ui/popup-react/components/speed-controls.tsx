import { LuFastForward, LuPause, LuPlay, LuRewind } from 'react-icons/lu';

import { adjustSpeed, runAction, setSpeed } from '../chrome-api';
import * as sh from '../shortcuts';
import { useShiftOnly } from '../use-shift-only';
import { HotkeyButton } from './hotkey-button';

type Props = {
  fasterStep: number;
  slowerStep: number;
};

const PresetButton = ({ shiftHeld, shortcut }: { shiftHeld: boolean; shortcut: sh.SpeedShortcut }) => {
  const speed = shiftHeld ? shortcut.shifted : shortcut.base;

  return (
    <HotkeyButton
      className="btn btn-sm btn-accent px-1"
      hotkey={shortcut.key}
      onShiftTrigger={() => setSpeed(shortcut.shifted)}
      onTrigger={() => setSpeed(shortcut.base)}
      shiftHeld={shiftHeld}
    >
      {speed}x
    </HotkeyButton>
  );
};

export const SpeedControls = ({ fasterStep, slowerStep }: Props) => {
  const shiftHeld = useShiftOnly();

  return (
    <div className="flex flex-col gap-3 p-4">
      <div className="flex items-stretch gap-1">
        <HotkeyButton
          className="btn btn-primary btn-sm h-auto px-1"
          hotkey={sh.SLOWER_KEY}
          onTrigger={() => adjustSpeed(-slowerStep)}
        >
          -{slowerStep}
        </HotkeyButton>

        <div className="grid flex-1 grid-cols-5 grid-rows-2 gap-1">
          {sh.SPEED_SHORTCUTS.map((shortcut) => (
            <PresetButton key={shortcut.key} shiftHeld={shiftHeld} shortcut={shortcut} />
          ))}
        </div>

        <HotkeyButton
          className="btn btn-sm btn-primary h-auto px-1"
          hotkey={sh.FASTER_KEY}
          onTrigger={() => adjustSpeed(fasterStep)}
        >
          +{fasterStep}
        </HotkeyButton>
      </div>

      <div className="grid grid-cols-3 gap-1">
        <HotkeyButton
          className="btn btn-sm btn-secondary"
          hotkey={sh.REWIND_KEY}
          onTrigger={() => runAction('rewind')}
          title="Rewind (←)"
        >
          <LuRewind size={18} />
        </HotkeyButton>

        <HotkeyButton
          className="btn btn-secondary btn-sm"
          hotkey={sh.PLAY_PAUSE_KEY}
          onTrigger={() => runAction('pause')}
          title="Play / pause (Space)"
        >
          <LuPlay size={16} />
          <LuPause size={16} />
        </HotkeyButton>

        <HotkeyButton
          className="btn btn-secondary btn-sm"
          hotkey={sh.ADVANCE_KEY}
          onTrigger={() => runAction('advance')}
          title="Advance (→)"
        >
          <LuFastForward size={18} />
        </HotkeyButton>
      </div>
    </div>
  );
};
