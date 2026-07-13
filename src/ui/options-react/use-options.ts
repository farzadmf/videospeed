import { VSC_DEFAULTS } from '@shared/defaults';
import { useEffect, useState } from 'react';

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

export type LeaderKey = { code: string; alt?: boolean; shift?: boolean; ctrl?: boolean };

export type SpbCategory = { name: string; color: string; should_skip: boolean };

// VSC_DEFAULTS literal infers types too narrowly (missing optional modifiers,
// widened enums). Declare the real stored shape explicitly; the defaults still
// supply the values, so the two stay aligned at the one call site that reads them.
export type Settings = Omit<typeof VSC_DEFAULTS, 'keyBindings' | 'leaderBindings' | 'leaderKey' | 'sites'> & {
  keyBindings: KeyBinding[];
  leaderBindings: LeaderBinding[];
  leaderKey: LeaderKey;
  sites: {
    youtube: {
      spb_sound_enabled: boolean;
      spb_skip_sound: string;
      spb_unskip_sound: string;
      spb_enabled: boolean;
      spb_interval: number;
      spb_categories: SpbCategory[];
    };
  };
};

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
