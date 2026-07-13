import { useEffect, useState } from 'react';

type Settings = {
  enabled: boolean;
  slowerStep: number;
  fasterStep: number;
  resetSpeed: number;
};

const DEFAULTS: Settings = { enabled: true, slowerStep: 0.1, fasterStep: 0.1, resetSpeed: 1.0 };

export function useSettings() {
  const [settings, setSettings] = useState(DEFAULTS);

  useEffect(() => {
    chrome.storage.sync.get(null, (storage) => {
      const bindings = Array.isArray(storage.keyBindings) ? storage.keyBindings : [];
      const valueOf = (action: string, fallback: number) => {
        const b = bindings.find((kb: { action?: string; value?: unknown }) => kb.action === action);
        return typeof b?.value === 'number' ? b.value : fallback;
      };

      setSettings({
        enabled: storage.enabled !== false,
        slowerStep: valueOf('slower', DEFAULTS.slowerStep),
        fasterStep: valueOf('faster', DEFAULTS.fasterStep),
        resetSpeed: valueOf('fast', DEFAULTS.resetSpeed),
      });
    });
  }, []);

  const setEnabled = (enabled: boolean) =>
    chrome.storage.sync.set({ enabled }, () => setSettings((s) => ({ ...s, enabled })));

  return { settings, setEnabled };
}
