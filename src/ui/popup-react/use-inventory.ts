import { useCallback, useEffect, useRef, useState } from 'react';

import { CommandOutcome, FrameSnapshot, MediaEntry, VideoAction, connectInventory } from './chrome-api';

// A frame heartbeats every 1 s. A page can remove a frame without it saying goodbye,
// so a frame silent this long is dropped; the margin covers a slow heartbeat.
const FRAME_TIMEOUT_MS = 5000;
const PRUNE_EVERY_MS = 1000;

// Long enough for every frame's first snapshot to arrive, so the selection rule sees
// the whole page rather than whichever frame answered first.
const SETTLE_MS = 150;

// A frame answers a command within milliseconds; this long with no answer means the
// frame that owned the video is gone.
const NO_ANSWER_MS = 1500;

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
 * @param onOutcome - called with how each command turned out
 * @returns the merged list, whether the first snapshots have had time to arrive, and a
 *   way to send a command to one video
 */
export function useInventory(onOutcome: (outcome: CommandOutcome, label: string) => void) {
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [settled, setSettled] = useState(false);

  // Created with the port in the effect; refs keep sendCommand stable across renders and
  // let the effect call the latest onOutcome.
  const send = useRef<(target: string, action: VideoAction) => void>(() => {});
  const onOutcomeRef = useRef(onOutcome);
  useEffect(() => {
    onOutcomeRef.current = onOutcome;
  });

  useEffect(() => {
    const frames = new Map<string, FrameState>();
    const unanswered = new Map<number, ReturnType<typeof setTimeout>>();
    let nextCommandId = 1;

    const publish = () => setVideos(mergeFrames(frames));

    const labelOf = (target: string) => mergeFrames(frames).find((v) => v.id === target)?.label ?? 'The video';

    // The video's frame may stay alive for seconds before a heartbeat would correct
    // the list, so remove a video the page says is gone right away.
    const dropVideo = (target: string) => {
      for (const frame of frames.values()) {
        frame.snapshot = { ...frame.snapshot, entries: frame.snapshot.entries.filter((e) => e.id !== target) };
      }
      publish();
    };

    const report = (outcome: CommandOutcome) => {
      // Name the video before dropping it, or a gone video would have no name to show.
      onOutcomeRef.current(outcome, labelOf(outcome.target));

      if (outcome.outcome === 'unknown-target') {
        dropVideo(outcome.target);
      }
    };

    const connection = connectInventory({
      onOutcome: (outcome) => {
        clearTimeout(unanswered.get(outcome.commandId));
        unanswered.delete(outcome.commandId);
        report(outcome);
      },
      onSnapshot: (snapshot) => {
        frames.set(snapshot.frameToken, { lastSeen: Date.now(), snapshot });
        publish();
      },
    });

    send.current = (target, action) => {
      const commandId = nextCommandId++;

      // Only the frame that owns the target answers. If that frame is gone, nothing
      // does, and a silent failure would look like the key did nothing.
      unanswered.set(
        commandId,
        setTimeout(() => {
          unanswered.delete(commandId);
          report({ action, commandId, kind: 'outcome', outcome: 'unknown-target', target });
        }, NO_ANSWER_MS)
      );

      connection.sendCommand(commandId, target, action);
    };

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
      connection.close();
      clearInterval(prune);
      clearTimeout(settle);
      unanswered.forEach(clearTimeout);
    };
  }, []);

  const sendCommand = useCallback((target: string, action: VideoAction) => send.current(target, action), []);

  return { sendCommand, settled, videos };
}
