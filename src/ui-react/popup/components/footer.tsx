import { openOptions } from '../chrome-api';

type Props = {
  enabled: boolean;
  status: string;
  onToggleEnabled: () => void;
};

export const Footer = ({ enabled, status, onToggleEnabled }: Props) => (
  <div className="footer">
    {status && <div className="status">{status}</div>}
    <div className="footer-controls">
      <button
        className={`icon-btn power-btn${enabled ? '' : ' disabled'}`}
        title={enabled ? 'Disable Extension' : 'Enable Extension'}
        onClick={onToggleEnabled}
      >
        ⏻
      </button>
      <button className="icon-btn settings-btn" title="Settings" onClick={openOptions}>
        ⚙
      </button>
    </div>
  </div>
);
