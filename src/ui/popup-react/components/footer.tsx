import { LuMonitor, LuMoon, LuPower, LuSettings, LuSun } from 'react-icons/lu';

import { Theme } from '../../theme';
import { openOptions } from '../chrome-api';
import { Notice } from '../notice';

type Props = {
  enabled: boolean;
  notice: Notice | undefined;
  onCycleTheme: () => void;
  onToggleEnabled: () => void;
  showEnable: boolean;
  theme: Theme;
};

const TONE_CLASS = { info: 'text-base-content', warning: 'text-warning' };

const THEME_ICON = { dark: LuMoon, light: LuSun, system: LuMonitor };
const THEME_LABEL = { dark: 'Dark', light: 'Light', system: 'System' };

export const Footer = ({ enabled, notice, onCycleTheme, onToggleEnabled, showEnable, theme }: Props) => {
  const ThemeIcon = THEME_ICON[theme];

  return (
    <div className="border-base-300 bg-base-200 flex items-center gap-2 border-t px-5 py-2">
      {/* Polite: a screen reader announces it without cutting off what it was saying. */}
      <div aria-live="polite" className="min-w-0 flex-1 text-xs leading-tight">
        {notice && (
          <>
            <div className={`font-semibold ${TONE_CLASS[notice.tone]}`}>{notice.title}</div>
            <div className="text-base-content/70 truncate" title={notice.detail}>
              {notice.detail}
            </div>
          </>
        )}
      </div>
      <div className="flex shrink-0 gap-1">
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
