import { LuPower, LuSettings } from 'react-icons/lu';

import { openOptions } from '../chrome-api';

type Props = {
  enabled: boolean;
  status: string;
  onToggleEnabled: () => void;
};

export const Footer = ({ enabled, status, onToggleEnabled }: Props) => (
  <div className="border-base-300 bg-base-200 flex items-center gap-2 border-t px-5 py-2">
    {status && <span className="text-base-content/70 text-xs">{status}</span>}
    <div className="ml-auto flex gap-1">
      <button
        className={`btn btn-circle btn-ghost ${enabled ? 'text-success' : 'text-error'}`}
        title={enabled ? 'Disable Extension' : 'Enable Extension'}
        onClick={onToggleEnabled}
      >
        <LuPower size={18} />
      </button>
      <button className="btn btn-circle btn-ghost" title="Settings" onClick={openOptions}>
        <LuSettings size={18} />
      </button>
    </div>
  </div>
);
