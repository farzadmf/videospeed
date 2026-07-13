import { LuPower, LuSettings } from 'react-icons/lu';

import { openOptions } from '../chrome-api';

type Props = {
  enabled: boolean;
  status: string;
  onToggleEnabled: () => void;
};

export const Footer = ({ enabled, status, onToggleEnabled }: Props) => (
  <div className="footer">
    <div className="footer-content">
      {status && <div className="status">{status}</div>}
      <div className="footer-controls">
        <button
          className={`icon-btn power-btn${enabled ? '' : ' disabled'}`}
          title={enabled ? 'Disable Extension' : 'Enable Extension'}
          onClick={onToggleEnabled}
        >
          <LuPower size={20} />
        </button>
        <button className="icon-btn settings-btn" title="Settings" onClick={openOptions}>
          <LuSettings size={20} />
        </button>
      </div>
    </div>
  </div>
);
