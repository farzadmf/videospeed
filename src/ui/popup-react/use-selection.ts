import { useState } from 'react';

import { VideoItem } from './use-inventory';

/**
 * The video the popup opens on: a playing video in view, else the most visible
 * video in view, else the first video. Ties go to the larger visible area.
 */
export function pickDefault(videos: VideoItem[]): VideoItem | undefined {
  const inView = videos.filter((v) => v.inView);
  const playing = inView.filter((v) => v.playing);
  const pool = playing.length > 0 ? playing : inView;

  if (pool.length === 0) {
    return videos[0];
  }

  return pool.reduce((best, v) => (v.visibleArea > best.visibleArea ? v : best));
}

/**
 * Selection for the popup session. It is picked once the first snapshots have
 * arrived, then changes only by user action; it does not follow scrolling. If the
 * selected video goes away, the default rule picks again.
 */
export function useSelection(videos: VideoItem[], settled: boolean) {
  const [selectedId, setSelectedId] = useState<string | undefined>();

  // Adjusted during render rather than in an effect, as React recommends for state
  // derived from props: the guard makes it settle in one extra render.
  const selectedExists = selectedId !== undefined && videos.some((v) => v.id === selectedId);
  if (settled && !selectedExists) {
    const fallback = pickDefault(videos)?.id;
    if (fallback !== selectedId) {
      setSelectedId(fallback);
    }
  }

  const move = (step: number) => {
    if (videos.length === 0) {
      return;
    }

    const current = videos.findIndex((v) => v.id === selectedId);
    const next = (current + step + videos.length) % videos.length;
    setSelectedId(videos[next].id);
  };

  return {
    select: setSelectedId,
    selected: videos.find((v) => v.id === selectedId),
    selectNext: () => move(1),
    selectPrevious: () => move(-1),
  };
}
