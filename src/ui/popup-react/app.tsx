import { useHotkey } from '@tanstack/react-hotkeys';
import { useEffect, useState } from 'react';

import { nextTheme } from '../theme';
import { VideoAction, VscStatus, getStatus } from './chrome-api';
import { Footer } from './components/footer';
import { Section } from './components/section';
import { ShortcutsView } from './components/shortcuts-view';
import { SpeedControls } from './components/speed-controls';
import { VideoList } from './components/video-list';
import { noticeForOutcome, useNotice } from './notice';
import { HELP_KEY } from './shortcuts';
import { useInventory } from './use-inventory';
import { useSelection } from './use-selection';
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
  const [probe, setProbe] = useState<VscStatus | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const { notice, show: showNotice } = useNotice();
  const { sendCommand, settled, videos } = useInventory((outcome, label) => {
    const next = noticeForOutcome(outcome, label);
    if (next) {
      showNotice(next);
    }
  });
  const selection = useSelection(videos, settled);

  useHotkey({ key: HELP_KEY, shift: true }, () => setShowHelp((v) => !v));

  // Every action goes to the selected video only, never to the rest of the page.
  const actOnSelected = (action: VideoAction) => {
    if (selection.selected) {
      sendCommand(selection.selected.id, action);
    }
  };

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
    showNotice({
      detail: 'Reload the page to apply',
      persist: true,
      title: next ? 'Enabled' : 'Disabled',
      tone: 'info',
    });
  };

  return (
    <div className="bg-base-500 text-base-content w-96">
      <div className="grid">
        {showHelp && <ShortcutsView onClose={() => setShowHelp(false)} />}

        {!showHelp && (
          <div className="col-start-1 row-start-1">
            {availability === 'active' && (
              <div className="flex flex-col gap-3 p-4">
                {videos.length > 0 && (
                  <Section title={`Videos (${videos.length})`}>
                    <VideoList
                      onSelect={selection.select}
                      onSelectNext={selection.selectNext}
                      onSelectPrevious={selection.selectPrevious}
                      selectedId={selection.selected?.id}
                      videos={videos}
                    />
                  </Section>
                )}

                <Section title="Controls">
                  <SpeedControls
                    fasterStep={settings.fasterStep}
                    onAction={actOnSelected}
                    slowerStep={settings.slowerStep}
                  />
                </Section>
              </div>
            )}

            {availability === 'probing' && <div className="text-base-content/60 p-4 text-sm">Checking…</div>}

            {availability === 'unreachable' && (
              <div className="text-base-content/70 p-4 text-sm">VideoSpeed isn't available on this page.</div>
            )}

            {availability === 'disabled' && (
              <div className="text-base-content/70 p-4 text-sm">VideoSpeed is disabled on this page.</div>
            )}

            {availability === 'no-video' && (
              <div className="text-base-content/70 p-4 text-sm">No video found on this page.</div>
            )}
          </div>
        )}
      </div>

      <Footer
        enabled={settings.enabled}
        notice={notice}
        onCycleTheme={() => setTheme(nextTheme(settings.theme))}
        onToggleEnabled={toggleEnabled}
        showEnable={availability !== 'probing' && availability !== 'unreachable'}
        theme={settings.theme}
      />
    </div>
  );
};
