import { useHotkey } from '@tanstack/react-hotkeys';
import { LuPlay } from 'react-icons/lu';

import { SELECT_NEXT_ARROW, SELECT_NEXT_KEY, SELECT_PREVIOUS_ARROW, SELECT_PREVIOUS_KEY } from '../shortcuts';
import { VideoItem } from '../use-inventory';

// Fixed widths for every column but the label, so each row lines up with the others:
// label, play mark, speed, in-view badge.
const ROW_COLUMNS = 'grid grid-cols-[minmax(0,1fr)_1rem_3rem_4.5rem]';

type Props = {
  onSelect: (id: string) => void;
  onSelectNext: () => void;
  onSelectPrevious: () => void;
  selectedId: string | undefined;
  videos: VideoItem[];
};

export const VideoList = ({ onSelect, onSelectNext, onSelectPrevious, selectedId, videos }: Props) => {
  useHotkey({ key: SELECT_NEXT_KEY }, onSelectNext);
  useHotkey({ key: SELECT_NEXT_ARROW }, onSelectNext);
  useHotkey({ key: SELECT_PREVIOUS_KEY }, onSelectPrevious);
  useHotkey({ key: SELECT_PREVIOUS_ARROW }, onSelectPrevious);

  return (
    <ul className="flex flex-col gap-0.5">
      {videos.map((video) => {
        const selected = video.id === selectedId;

        return (
          <li key={video.id}>
            <button
              className={`${ROW_COLUMNS} w-full items-center gap-2 rounded px-2 py-1 text-left text-sm ${
                selected ? 'bg-primary/20 outline-primary outline-1' : 'hover:bg-base-content/10'
              }`}
              onClick={() => onSelect(video.id)}
            >
              <span className="min-w-0 truncate" title={video.label}>
                {video.label}
              </span>

              <span className="flex justify-center">{video.playing && <LuPlay size={12} />}</span>

              <span className="text-base-content/70 text-right tabular-nums">{video.speed.toFixed(1)}x</span>

              <span
                className={`badge badge-xs w-full ${video.inView ? 'badge-success' : 'badge-ghost text-base-content/60'}`}
              >
                {video.inView ? 'in view' : 'off-screen'}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
};
