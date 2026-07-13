import { useState } from 'react';

import { Footer } from './components/footer';
import { SpeedControls } from './components/speed-controls';
import { useSettings } from './use-settings';

export const App = () => {
  const { settings, setEnabled } = useSettings();
  const [status, setStatus] = useState('');

  const toggleEnabled = () => {
    const next = !settings.enabled;
    setEnabled(next);
    setStatus(`${next ? 'Enabled' : 'Disabled'}. Reload page.`);
  };

  return (
    <div className="popup-container">
      <SpeedControls slowerStep={settings.slowerStep} fasterStep={settings.fasterStep} resetSpeed={settings.resetSpeed} />
      <Footer enabled={settings.enabled} status={status} onToggleEnabled={toggleEnabled} />
    </div>
  );
};
