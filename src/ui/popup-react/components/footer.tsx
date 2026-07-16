import { LuMonitor, LuMoon, LuPower, LuSettings, LuSun } from 'react-icons/lu';

import { Theme } from '../../theme';
import { openOptions } from '../chrome-api';

type Props = {
  enabled: boolean;
  showEnable: boolean;
  status: string;
  theme: Theme;
  onToggleEnabled: () => void;
  onCycleTheme: () => void;
};

const THEME_ICON = { light: LuSun, dark: LuMoon, system: LuMonitor };
const THEME_LABEL = { light: 'Light', dark: 'Dark', system: 'System' };

export const Footer = ({ enabled, showEnable, status, theme, onToggleEnabled, onCycleTheme }: Props) => {
  const ThemeIcon = THEME_ICON[theme];

  return (
    <div className="border-base-300 bg-base-200 flex items-center gap-2 border-t px-5 py-2">
      {status && <span className="text-base-content/70 text-xs">{status}</span>}
      <div className="ml-auto flex gap-1">
        <button
          className="btn btn-circle btn-soft btn-primary"
          title={`Theme: ${THEME_LABEL[theme]} (click to change)`}
          onClick={onCycleTheme}
        >
          <ThemeIcon size={18} />
        </button>
        {showEnable && (
          <button
            className={`btn btn-circle btn-soft ${enabled ? 'btn-success' : 'btn-error'}`}
            title={enabled ? 'Disable Extension' : 'Enable Extension'}
            onClick={onToggleEnabled}
          >
            <LuPower size={18} />
          </button>
        )}
        <button className="btn btn-circle btn-soft btn-primary" title="Settings" onClick={openOptions}>
          <LuSettings size={18} />
        </button>
      </div>
    </div>
  );
};
