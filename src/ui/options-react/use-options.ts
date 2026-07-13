import { VSC_DEFAULTS } from '@shared/defaults';
import { useEffect, useState } from 'react';

// The stored settings shape is defined once, by the shared defaults the content
// script also reads. Deriving the type from it keeps options in lockstep.
export type Settings = typeof VSC_DEFAULTS;

export type ActionDef = { name: string; description: string; value?: number; value2?: number; predefined?: boolean };

export type KeyBinding = {
  action: ActionDef;
  code: string;
  predefined?: boolean;
  alt?: boolean;
  shift?: boolean;
  ctrl?: boolean;
  value?: number;
  value2?: number;
};

export type LeaderBinding = Omit<KeyBinding, 'predefined' | 'value' | 'value2'>;

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
