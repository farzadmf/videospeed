import { useHotkey } from '@tanstack/react-hotkeys';
import { ReactNode, useEffect, useRef, useState } from 'react';

const FLASH_MS = 200;
const FLASH_CLASS = '!bg-warning !text-warning-content';

type Props = {
  children: ReactNode;
  className: string;
  hotkey: string;
  onTrigger: () => void;
  // When set, Shift+hotkey (and a shift-held click) fire this instead.
  onShiftTrigger?: () => void;
  // Whether a plain click should use the shifted action (Shift currently held).
  shiftHeld?: boolean;
  title?: string;
};

export const HotkeyButton = ({ children, className, hotkey, onShiftTrigger, onTrigger, shiftHeld, title }: Props) => {
  const [flashing, setFlashing] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  const fire = (fn: () => void) => {
    fn();

    clearTimeout(timer.current);
    setFlashing(true);
    timer.current = setTimeout(() => setFlashing(false), FLASH_MS);
  };

  useHotkey({ key: hotkey }, () => fire(onTrigger));
  useHotkey({ key: hotkey, shift: true }, () => fire(onShiftTrigger ?? onTrigger), { enabled: !!onShiftTrigger });

  const onClick = () => fire(shiftHeld && onShiftTrigger ? onShiftTrigger : onTrigger);

  return (
    <button className={`${className} ${flashing ? FLASH_CLASS : ''}`} title={title} onClick={onClick}>
      {children}
    </button>
  );
};
