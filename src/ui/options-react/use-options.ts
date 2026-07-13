import { VSC_DEFAULTS } from '@shared/defaults';
import { useEffect, useState } from 'react';

// The stored settings shape is defined once, by the shared defaults the content
// script also reads. Deriving the type from it keeps options in lockstep.
export type Settings = typeof VSC_DEFAULTS;

export function useOptions() {
  const [settings, setSettings] = useState<Settings | null>(null);

  useEffect(() => {
    chrome.storage.sync.get(VSC_DEFAULTS, (stored) => setSettings(stored as Settings));
  }, []);

  const save = (next: Settings) => new Promise<void>((resolve) => chrome.storage.sync.set(next, () => resolve()));

  const restoreDefaults = () =>
    new Promise<void>((resolve) =>
      chrome.storage.sync.set(VSC_DEFAULTS, () => {
        setSettings(structuredClone(VSC_DEFAULTS));
        resolve();
      })
    );

  return { settings, setSettings, save, restoreDefaults };
}
