import { LOG_LEVELS } from '@shared/constants';

import { Theme, applyTheme } from '../../theme';
import { Settings } from '../use-options';
import { CheckboxField, SelectField, TextField } from './fields';

type Props = {
  settings: Settings;
  update: (patch: Partial<Settings>) => void;
};

const THEME_OPTIONS = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

// Log levels the options page offers, derived from the shared enum. Matches the
// original page: ERROR(2) through VERBOSE(6).
const LOG_LEVEL_OPTIONS = [
  { value: LOG_LEVELS.ERROR, label: '2: ERROR' },
  { value: LOG_LEVELS.WARNING, label: '3: WARNING' },
  { value: LOG_LEVELS.INFO, label: '4: INFO' },
  { value: LOG_LEVELS.DEBUG, label: '5: DEBUG' },
  { value: LOG_LEVELS.VERBOSE, label: '6: TRACE (VERBOSE)' },
];

export const OtherSettings = ({ settings, update }: Props) => (
  <div className="flex flex-col gap-1">
    <SelectField
      label="Theme"
      value={settings.theme}
      options={THEME_OPTIONS}
      onChange={(v) => {
        applyTheme(v as Theme);
        update({ theme: v as Theme });
      }}
    />
    <CheckboxField label="Enable" checked={settings.enabled} onChange={(v) => update({ enabled: v })} />
    <CheckboxField
      label="Hide controller by default"
      checked={settings.startHidden}
      onChange={(v) => update({ startHidden: v })}
    />
    <CheckboxField
      label="Remember playback speed"
      checked={settings.rememberSpeed}
      onChange={(v) => update({ rememberSpeed: v })}
    />
    <CheckboxField
      label={
        <>
          Exclusive keys
          <br />
          <em className="text-base-content/70 text-base">
            When possible, prevent websites from also handling VSC shortcut keys
          </em>
        </>
      }
      checked={settings.exclusiveKeys}
      onChange={(v) => update({ exclusiveKeys: v })}
    />
    <CheckboxField
      label={
        <>
          Force last saved speed
          <br />
          <em className="text-base-content/70 text-base">
            Useful for video players that override the speeds set by VideoSpeed
          </em>
        </>
      }
      checked={settings.forceLastSavedSpeed}
      onChange={(v) => update({ forceLastSavedSpeed: v })}
    />
    <CheckboxField
      label="Work on audio"
      checked={settings.audioBoolean}
      onChange={(v) => update({ audioBoolean: v })}
    />
    <CheckboxField
      label={
        <>
          Anchor positioning
          <br />
          <em className="text-base-content/70 text-base">
            On by default. Turn off to position the controller with JS scroll/resize tracking instead.
          </em>
        </>
      }
      checked={settings.anchorPositioning}
      onChange={(v) => update({ anchorPositioning: v })}
    />

    <TextField
      label="Controller opacity"
      type="number"
      value={settings.controllerOpacity}
      onChange={(v) => update({ controllerOpacity: Number(v) })}
    />
    <TextField
      label="Controller button size"
      type="number"
      value={settings.controllerButtonSize}
      onChange={(v) => update({ controllerButtonSize: Number(v) })}
    />
    <SelectField
      label="Log level"
      value={settings.logLevel}
      options={LOG_LEVEL_OPTIONS}
      onChange={(v) => update({ logLevel: Number(v) })}
    />

    <label className="flex flex-col gap-1 py-1">
      <span className="text-base">Sites on which extension is disabled (one per line). Regex supported.</span>
      <textarea
        className="textarea textarea-bordered h-40 font-mono text-base"
        value={settings.blacklist.join('\n')}
        onChange={(e) => update({ blacklist: e.target.value.split('\n') })}
      />
    </label>
  </div>
);
