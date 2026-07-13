import { ACTIONS, actionByName } from '@shared/actions';

import { ActionDef, LeaderBinding, Settings } from '../use-options';
import { SelectField, TextField } from './fields';
import { KeyInput, Modifiers } from './key-input';

type Props = {
  settings: Settings;
  update: (patch: Partial<Settings>) => void;
};

const ALL_ACTIONS = Object.values(ACTIONS) as ActionDef[];

const EXIT_OPTIONS = [
  { value: 'timer', label: 'Timer (auto-exit when idle)' },
  { value: 'key', label: 'Key (Escape or leader key)' },
];

export const LeaderModeSection = ({ settings, update }: Props) => {
  const leaderKey = settings.leaderKey;
  const bindings = settings.leaderBindings;

  const setLeaderKey = (patch: Partial<typeof leaderKey>) => update({ leaderKey: { ...leaderKey, ...patch } });

  const setBinding = (idx: number, patch: Partial<LeaderBinding>) =>
    update({ leaderBindings: bindings.map((b, i) => (i === idx ? { ...b, ...patch } : b)) });

  const addBinding = () => update({ leaderBindings: [...bindings, { action: ALL_ACTIONS[0], code: '' }] });

  const removeBinding = (idx: number) => update({ leaderBindings: bindings.filter((_, i) => i !== idx) });

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h3 className="text-lg font-semibold">Leader key</h3>
        <p className="text-base-content/70 mb-2 text-sm">
          Press this key to enter leader mode, then press a leader binding to run an action. Modifiers are optional.
        </p>
        <div className="flex items-start gap-4">
          <Modifiers
            mods={{ alt: !!leaderKey.alt, shift: !!leaderKey.shift, ctrl: !!leaderKey.ctrl }}
            onChange={(mods) => setLeaderKey(mods)}
          />
          <div className="w-48">
            <KeyInput code={leaderKey.code} onCapture={(code, mods) => setLeaderKey({ code, ...mods })} />
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold">Leader bindings</h3>
        <p className="text-base-content/70 mb-2 text-sm">
          Key pressed after the leader key to run an action. Modifiers are optional.
        </p>
        <table className="table text-base">
          <thead>
            <tr className="text-base">
              <th className="w-2/5">Command</th>
              <th>Modifiers</th>
              <th>Key</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {bindings.map((b, idx) => (
              <tr key={idx}>
                <td>
                  <select
                    className="select select-bordered select-sm w-full"
                    value={b.action.name}
                    onChange={(e) => setBinding(idx, { action: actionByName(e.target.value) as ActionDef })}
                  >
                    {ALL_ACTIONS.map((a) => (
                      <option key={a.name} value={a.name}>
                        {a.description}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  <Modifiers
                    mods={{ alt: !!b.alt, shift: !!b.shift, ctrl: !!b.ctrl }}
                    onChange={(mods) => setBinding(idx, mods)}
                  />
                </td>
                <td>
                  <KeyInput code={b.code} onCapture={(code, mods) => setBinding(idx, { code, ...mods })} />
                </td>
                <td>
                  <button className="btn btn-error btn-xs" onClick={() => removeBinding(idx)}>
                    X
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <button className="btn btn-primary btn-sm mt-2 self-start" onClick={addBinding}>
          Add New
        </button>
      </div>

      <div>
        <h3 className="text-lg font-semibold">Exit behavior</h3>
        <p className="text-base-content/70 mb-2 text-sm">
          Timer auto-exits after a period of inactivity; Key stays until you press Escape or the leader key again.
        </p>
        <SelectField
          label="Exit mode"
          value={settings.leaderExit}
          options={EXIT_OPTIONS}
          onChange={(v) => update({ leaderExit: v })}
        />
        <TextField
          label="Idle timeout (ms)"
          type="number"
          value={settings.leaderTimeout}
          onChange={(v) => update({ leaderTimeout: Number(v) })}
        />
      </div>
    </div>
  );
};
