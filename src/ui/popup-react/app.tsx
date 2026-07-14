import { useState } from 'react';

import { nextTheme } from '../theme';
import { Footer } from './components/footer';
import { SpeedControls } from './components/speed-controls';
import { useSettings } from './use-settings';

export const App = () => {
  const { settings, setEnabled, setTheme } = useSettings();
  const [status, setStatus] = useState('');

  const toggleEnabled = () => {
    const next = !settings.enabled;
    setEnabled(next);
    setStatus(`${next ? 'Enabled' : 'Disabled'}. Reload page.`);
  };

  return (
    <div className="bg-base-100 text-base-content w-72">
      <SpeedControls slowerStep={settings.slowerStep} fasterStep={settings.fasterStep} resetSpeed={settings.resetSpeed} />
      <Footer
        enabled={settings.enabled}
        status={status}
        theme={settings.theme}
        onToggleEnabled={toggleEnabled}
        onCycleTheme={() => setTheme(nextTheme(settings.theme))}
      />
    </div>
  );
};
