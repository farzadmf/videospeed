import { LuFastForward, LuPause, LuPlay, LuRewind } from 'react-icons/lu';

import { VideoAction } from '../chrome-api';
import * as sh from '../shortcuts';
import { useShiftOnly } from '../use-shift-only';
import { HotkeyButton } from './hotkey-button';

type Props = {
  fasterStep: number;
  onAction: (action: VideoAction) => void;
  slowerStep: number;
};

type PresetProps = {
  onAction: (action: VideoAction) => void;
  shiftHeld: boolean;
  shortcut: sh.SpeedShortcut;
};

const PresetButton = ({ onAction, shiftHeld, shortcut }: PresetProps) => {
  const speed = shiftHeld ? shortcut.shifted : shortcut.base;

  return (
    <HotkeyButton
      className="btn btn-sm btn-accent px-1"
      hotkey={shortcut.key}
      onShiftTrigger={() => onAction({ name: 'SET_SPEED', value: shortcut.shifted })}
      onTrigger={() => onAction({ name: 'SET_SPEED', value: shortcut.base })}
      shiftHeld={shiftHeld}
    >
      {speed}x
    </HotkeyButton>
  );
};

export const SpeedControls = ({ fasterStep, onAction, slowerStep }: Props) => {
  const shiftHeld = useShiftOnly();

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-stretch gap-1">
        <HotkeyButton
          className="btn btn-primary btn-sm h-auto px-1"
          hotkey={sh.SLOWER_KEY}
          onTrigger={() => onAction({ name: 'ADJUST_SPEED', value: -slowerStep })}
        >
          -{slowerStep}
        </HotkeyButton>

        <div className="grid flex-1 grid-cols-5 grid-rows-2 gap-1">
          {sh.SPEED_SHORTCUTS.map((shortcut) => (
            <PresetButton key={shortcut.key} onAction={onAction} shiftHeld={shiftHeld} shortcut={shortcut} />
          ))}
        </div>

        <HotkeyButton
          className="btn btn-sm btn-primary h-auto px-1"
          hotkey={sh.FASTER_KEY}
          onTrigger={() => onAction({ name: 'ADJUST_SPEED', value: fasterStep })}
        >
          +{fasterStep}
        </HotkeyButton>
      </div>

      <div className="grid grid-cols-3 gap-1">
        <HotkeyButton
          className="btn btn-sm btn-secondary"
          hotkey={sh.REWIND_KEY}
          hotkeyAlt={sh.REWIND_ARROW}
          onTrigger={() => onAction({ name: 'rewind' })}
          title="Rewind (H / ←)"
        >
          <LuRewind size={18} />
        </HotkeyButton>

        <HotkeyButton
          className="btn btn-secondary btn-sm"
          hotkey={sh.PLAY_PAUSE_KEY}
          onTrigger={() => onAction({ name: 'pause' })}
          title="Play / pause (Space)"
        >
          <LuPlay size={16} />
          <LuPause size={16} />
        </HotkeyButton>

        <HotkeyButton
          className="btn btn-secondary btn-sm"
          hotkey={sh.ADVANCE_KEY}
          hotkeyAlt={sh.ADVANCE_ARROW}
          onTrigger={() => onAction({ name: 'advance' })}
          title="Advance (L / →)"
        >
          <LuFastForward size={18} />
        </HotkeyButton>
      </div>
    </div>
  );
};
