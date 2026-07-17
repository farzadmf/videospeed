import { useEffect, useState } from 'react';

import { Theme, applyTheme } from '../theme';

type Settings = {
  enabled: boolean;
  slowerStep: number;
  fasterStep: number;
  theme: Theme;
};

const DEFAULTS: Settings = { enabled: true, slowerStep: 0.1, fasterStep: 0.1, theme: 'system' };

// The stored keyBindings entry's action is an object, so match by action.name.
function stepValue(bindings: { action?: { name?: string }; value?: unknown }[], name: string, fallback: number) {
  const b = bindings.find((kb) => kb.action?.name === name);
  return typeof b?.value === 'number' ? b.value : fallback;
}

export function useSettings() {
  const [settings, setSettings] = useState(DEFAULTS);

  useEffect(() => {
    chrome.storage.sync.get(null, (storage) => {
      const bindings = Array.isArray(storage.keyBindings) ? storage.keyBindings : [];
      const theme: Theme = (storage.theme as Theme) ?? DEFAULTS.theme;

      applyTheme(theme);
      setSettings({
        enabled: storage.enabled !== false,
        slowerStep: stepValue(bindings, 'slower', DEFAULTS.slowerStep),
        fasterStep: stepValue(bindings, 'faster', DEFAULTS.fasterStep),
        theme,
      });
    });
  }, []);

  const setEnabled = (enabled: boolean) =>
    chrome.storage.sync.set({ enabled }, () => setSettings((s) => ({ ...s, enabled })));

  const setTheme = (theme: Theme) =>
    chrome.storage.sync.set({ theme }, () => {
      applyTheme(theme);
      setSettings((s) => ({ ...s, theme }));
    });

  return { settings, setEnabled, setTheme };
}
