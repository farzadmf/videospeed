import { useEffect, useState } from 'react';

import { nextTheme } from '../theme';
import { VscStatus, getStatus } from './chrome-api';
import { Footer } from './components/footer';
import { SpeedControls } from './components/speed-controls';
import { useSettings } from './use-settings';

type Availability = 'probing' | 'unreachable' | 'disabled' | 'no-video' | 'active';

function availabilityOf(status: VscStatus | null): Availability {
  if (!status) {
    return 'probing';
  }

  if (!status.reachable) {
    return 'unreachable';
  }

  if (status.abort) {
    return 'disabled';
  }

  return status.controllerCount > 0 ? 'active' : 'no-video';
}

export const App = () => {
  const { settings, setEnabled, setTheme } = useSettings();
  const [status, setStatus] = useState('');
  const [probe, setProbe] = useState<VscStatus | null>(null);

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      const status = await getStatus();
      if (!cancelled) {
        setProbe(status);
      }
    };

    check();
    const timer = setInterval(check, 1000);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  const availability = availabilityOf(probe);

  const toggleEnabled = () => {
    const next = !settings.enabled;
    setEnabled(next);
    setStatus(`${next ? 'Enabled' : 'Disabled'}. Reload page.`);
  };

  return (
    <div className="bg-base-500 text-base-content w-64">
      {availability === 'active' && <SpeedControls slowerStep={settings.slowerStep} fasterStep={settings.fasterStep} />}

      {availability === 'probing' && <div className="text-base-content/60 p-4 text-sm">Checking…</div>}

      {availability === 'unreachable' && (
        <div className="text-base-content/70 p-4 text-sm">VideoSpeed isn't available on this page.</div>
      )}

      {availability === 'disabled' && (
        <div className="text-base-content/70 p-4 text-sm">VideoSpeed is disabled on this page.</div>
      )}

      {availability === 'no-video' && <div className="text-base-content/70 p-4 text-sm">No video found on this page.</div>}

      <Footer
        enabled={settings.enabled}
        showEnable={availability !== 'probing' && availability !== 'unreachable'}
        status={status}
        theme={settings.theme}
        onToggleEnabled={toggleEnabled}
        onCycleTheme={() => setTheme(nextTheme(settings.theme))}
      />
    </div>
  );
};
