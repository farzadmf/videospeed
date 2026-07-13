import { SPB_CATEGORIES } from '@shared/defaults';
import { LuPlay } from 'react-icons/lu';

import { Settings } from '../use-options';
import { CheckboxField, SelectField, TextField } from './fields';

type Props = {
  settings: Settings;
  update: (patch: Partial<Settings>) => void;
};

const SOUND_OPTIONS = [
  { value: 'beep', label: 'Beep' },
  { value: 'cartoon_blinking_01', label: 'Cartoon Blinking 1' },
  { value: 'cartoon_blinking_02', label: 'Cartoon Blinking 2' },
  { value: 'game_start', label: 'Game Start' },
  { value: 'new_notification', label: 'New Notification' },
  { value: 'pop_01', label: 'Pop 1' },
  { value: 'pop_02', label: 'Pop 2' },
];

type Category = { name: string; color: string; should_skip: boolean };

function previewSound(name: string) {
  const url = chrome.runtime?.id ? chrome.runtime.getURL(`assets/sounds/${name}.oga`) : '';
  if (!url) {
    return;
  }

  const audio = new Audio(url);
  audio.volume = 0.5;
  audio.play().catch(() => {});
}

export const SiteSettings = ({ settings, update }: Props) => {
  const yt = settings.sites.youtube;

  const patchYt = (patch: Partial<typeof yt>) => update({ sites: { ...settings.sites, youtube: { ...yt, ...patch } } });

  const savedByName = new Map<string, Category>(yt.spb_categories.map((c) => [c.name, c]));

  const setCategory = (name: string, next: Category | null) => {
    const kept = yt.spb_categories.filter((c) => c.name !== name);
    const categories = next ? [...kept, next] : kept;
    patchYt({ spb_categories: categories });
  };

  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-lg font-semibold">YouTube</h3>

      <CheckboxField
        label={
          <>
            Enable SponsorBlock
            <br />
            <em className="text-base-content/70 text-sm">Call SponsorBlock API to get sponsored sections</em>
          </>
        }
        checked={yt.spb_enabled}
        onChange={(v) => patchYt({ spb_enabled: v })}
      />
      <CheckboxField
        label={
          <>
            Play sound on segment skip
            <br />
            <em className="text-base-content/70 text-sm">Play a sound when a sponsored segment is skipped</em>
          </>
        }
        checked={yt.spb_sound_enabled}
        onChange={(v) => patchYt({ spb_sound_enabled: v })}
      />

      <div className="flex items-end gap-2">
        <SelectField
          label="Skip sound"
          value={yt.spb_skip_sound}
          options={SOUND_OPTIONS}
          onChange={(v) => patchYt({ spb_skip_sound: v })}
        />
        <button className="btn btn-square btn-soft btn-primary" title="Preview" onClick={() => previewSound(yt.spb_skip_sound)}>
          <LuPlay />
        </button>
      </div>
      <div className="flex items-end gap-2">
        <SelectField
          label="Unskip sound"
          value={yt.spb_unskip_sound}
          options={SOUND_OPTIONS}
          onChange={(v) => patchYt({ spb_unskip_sound: v })}
        />
        <button className="btn btn-square btn-soft btn-primary" title="Preview" onClick={() => previewSound(yt.spb_unskip_sound)}>
          <LuPlay />
        </button>
      </div>

      <TextField
        label="Refresh interval (seconds)"
        type="number"
        value={yt.spb_interval}
        onChange={(v) => patchYt({ spb_interval: Number(v) })}
      />

      <div className="mt-2">
        <div className="mb-1 text-base font-semibold">Categories</div>
        <p className="text-base-content/70 mb-2 text-sm">
          Which SponsorBlock categories to request; enable one to pick a color and toggle auto-skip.
        </p>
        <div className="grid grid-cols-2 gap-3">
          {SPB_CATEGORIES.map((cat) => {
            const existing = savedByName.get(cat.name);
            const enabled = !!existing;

            return (
              <div key={cat.name} className="border-base-300 rounded border p-2">
                <CheckboxField
                  label={cat.label}
                  checked={enabled}
                  onChange={(v) => setCategory(cat.name, v ? { name: cat.name, color: cat.color, should_skip: true } : null)}
                />
                {enabled && existing && (
                  <div className="mt-1 ml-8 flex flex-col gap-1">
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="color"
                        className="h-6 w-10"
                        value={existing.color}
                        onChange={(e) => setCategory(cat.name, { ...existing, color: e.target.value })}
                      />
                      color
                    </label>
                    <CheckboxField
                      label="Auto-skip"
                      checked={existing.should_skip}
                      onChange={(v) => setCategory(cat.name, { ...existing, should_skip: v })}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
