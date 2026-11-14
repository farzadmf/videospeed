import { useCallback, useEffect, useRef, useState } from 'react';

import { CommandOutcome, FrameSnapshot, MediaEntry, VideoAction, connectInventory } from './chrome-api';

// A frame heartbeats every 1 s. A page can remove a frame without it saying goodbye,
// so a frame silent this long is dropped; the margin covers a slow heartbeat.
const FRAME_TIMEOUT_MS = 5000;
const PRUNE_EVERY_MS = 1000;

// Long enough for every frame's first snapshot to arrive, so the selection rule sees
// the whole page rather than whichever frame answered first.
const SETTLE_MS = 150;

export type VideoItem = MediaEntry & {
  frameToken: string;
};

type FrameState = {
  lastSeen: number;
  snapshot: FrameSnapshot;
};

/**
 * Top frame first, then the rest by URL. Not by arrival: frames answer in a different
 * order on each open, which would move rows and the j/k positions between opens.
 */
function compareFrames(a: FrameSnapshot, b: FrameSnapshot): number {
  if (a.isTop !== b.isTop) {
    return a.isTop ? -1 : 1;
  }
  return a.url.localeCompare(b.url) || a.frameToken.localeCompare(b.frameToken);
}

function mergeFrames(frames: Map<string, FrameState>): VideoItem[] {
  const ordered = [...frames.values()].map((f) => f.snapshot).sort(compareFrames);
  const videos = ordered.flatMap((snapshot) =>
    snapshot.entries.map((entry) => ({ ...entry, frameToken: snapshot.frameToken }))
  );

  // Only the merged list knows a video's position across frames.
  return videos.map((video, i) => ({ ...video, label: video.label || `Video ${i + 1}` }));
}

/**
 * The page's videos across every frame, live while the popup is open.
 * @returns the merged list, whether the first snapshots have had time to arrive, the
 *   outcome of the last command, and a way to send a command to one video
 */
export function useInventory() {
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [settled, setSettled] = useState(false);
  const [lastOutcome, setLastOutcome] = useState<CommandOutcome | undefined>();

  // Created with the port in the effect; a ref keeps sendCommand stable across renders.
  const send = useRef<(target: string, action: VideoAction) => void>(() => {});

  useEffect(() => {
    const frames = new Map<string, FrameState>();

    const publish = () => setVideos(mergeFrames(frames));

    const { close: disconnect, sendCommand } = connectInventory({
      onOutcome: setLastOutcome,
      onSnapshot: (snapshot) => {
        frames.set(snapshot.frameToken, { lastSeen: Date.now(), snapshot });
        publish();
      },
    });
    send.current = sendCommand;

    const prune = setInterval(() => {
      const cutoff = Date.now() - FRAME_TIMEOUT_MS;
      let changed = false;

      for (const [token, frame] of frames) {
        if (frame.lastSeen < cutoff) {
          frames.delete(token);
          changed = true;
        }
      }

      if (changed) {
        publish();
      }
    }, PRUNE_EVERY_MS);

    const settle = setTimeout(() => setSettled(true), SETTLE_MS);

    return () => {
      disconnect();
      clearInterval(prune);
      clearTimeout(settle);
    };
  }, []);

  const sendCommand = useCallback((target: string, action: VideoAction) => send.current(target, action), []);

  return { lastOutcome, sendCommand, settled, videos };
}
