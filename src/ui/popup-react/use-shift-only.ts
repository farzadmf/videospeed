import { useEffect, useState } from 'react';

// Reads live event modifier flags: useHeldKeys() misses a Shift already down at mount.
export function useShiftOnly(): boolean {
  const [shiftOnly, setShiftOnly] = useState(false);

  useEffect(() => {
    const sync = (event: KeyboardEvent) => {
      setShiftOnly(event.shiftKey && !event.ctrlKey && !event.altKey && !event.metaKey);
    };

    window.addEventListener('keydown', sync);
    window.addEventListener('keyup', sync);

    return () => {
      window.removeEventListener('keydown', sync);
      window.removeEventListener('keyup', sync);
    };
  }, []);

  return shiftOnly;
}
