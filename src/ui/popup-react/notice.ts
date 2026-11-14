import { useCallback, useEffect, useRef, useState } from 'react';

import { CommandOutcome, VideoAction } from './chrome-api';

// Long enough to read two short lines, short enough not to describe a stale action.
const NOTICE_MS = 4000;

/**
 * What the footer shows. `title` is always one of a few short fixed sentences so it
 * never needs truncating; `detail` is the one part that can be long (a video's name),
 * and the footer gives it a line of its own with an ellipsis.
 */
export type Notice = {
  detail: string;
  /** Stays until replaced: an instruction the user still has to act on */
  persist?: boolean;
  title: string;
  tone: 'info' | 'warning';
};

function actionLabel(action: VideoAction): string {
  switch (action.name) {
    case 'ADJUST_SPEED':
      return (action.value ?? 0) < 0 ? 'Slow down' : 'Speed up';
    case 'SET_SPEED':
      return `Speed ${action.value}x`;
    case 'advance':
      return 'Advance';
    case 'pause':
      return 'Play';
    case 'rewind':
      return 'Rewind';
    default:
      return action.name;
  }
}

/** @returns the notice for a command that did not apply, or undefined when it did */
export function noticeForOutcome(outcome: CommandOutcome, label: string): Notice | undefined {
  switch (outcome.outcome) {
    case 'applied':
      return undefined;
    case 'refused':
      return { detail: label, title: `${actionLabel(outcome.action)} was blocked`, tone: 'warning' };
    case 'unknown-target':
      return { detail: label, title: 'Video is no longer on the page', tone: 'warning' };
  }
}

/** A notice that clears itself, restarting the clock when a new one replaces it. */
export function useNotice() {
  const [notice, setNotice] = useState<Notice | undefined>();
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  const show = useCallback((next: Notice) => {
    clearTimeout(timer.current);
    setNotice(next);

    if (!next.persist) {
      timer.current = setTimeout(() => setNotice(undefined), NOTICE_MS);
    }
  }, []);

  return { notice, show };
}
