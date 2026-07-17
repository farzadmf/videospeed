import { HELP_ROWS } from '../shortcuts';

type Props = {
  onClose: () => void;
};

export const ShortcutsView = ({ onClose }: Props) => (
  <div className="bg-base-100/95 z-10 col-start-1 row-start-1 flex flex-col p-4" onClick={onClose}>
    <div className="mb-2 flex items-center justify-between">
      <span className="font-semibold">Shortcuts</span>
      <span className="text-base-content/50 text-xs">? or click to close</span>
    </div>

    <div className="flex flex-col gap-1">
      {HELP_ROWS.map((row) => (
        <div key={row.keys} className="flex items-baseline justify-between gap-3 text-sm">
          <kbd className="kbd kbd-sm shrink-0 whitespace-nowrap">{row.keys}</kbd>
          <span className="text-base-content/80 text-right">{row.desc}</span>
        </div>
      ))}
    </div>
  </div>
);
