import { ACTIONS, NO_VALUE_ACTIONS, actionByName } from '@shared/actions';

import { ActionDef, KeyBinding, Settings } from '../use-options';
import { KeyInput, Modifiers } from './key-input';

type Props = {
  settings: Settings;
  update: (patch: Partial<Settings>) => void;
};

const ALL_ACTIONS = Object.values(ACTIONS) as ActionDef[];

export const KeyBindings = ({ settings, update }: Props) => {
  const bindings = settings.keyBindings;

  const sorted = [...bindings].sort((a, b) => a.action.description.localeCompare(b.action.description));

  const setBinding = (target: KeyBinding, patch: Partial<KeyBinding>) =>
    update({ keyBindings: bindings.map((b) => (b === target ? { ...b, ...patch } : b)) });

  const removeBinding = (target: KeyBinding) => update({ keyBindings: bindings.filter((b) => b !== target) });

  const usedNames = new Set(bindings.map((b) => b.action.name));
  const available = ALL_ACTIONS.filter((a) => !usedNames.has(a.name));

  const addBinding = () => {
    const action = available[0] ?? ALL_ACTIONS[0];
    update({ keyBindings: [...bindings, { action, code: '' }] });
  };

  return (
    <div className="flex flex-col gap-3">
      <table className="table text-base">
        <thead>
          <tr className="text-base">
            <th className="w-1/5">Command</th>
            <th>Modifiers</th>
            <th>Key</th>
            <th>Value(s)</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((b, idx) => {
            const noValue = NO_VALUE_ACTIONS.includes(b.action.name);
            const hasValue2 = b.action.value2 !== undefined;

            return (
              <tr key={`${b.action.name}-${idx}`}>
                <td>
                  <select
                    className="select select-bordered select-sm w-full"
                    value={b.action.name}
                    disabled={b.predefined}
                    onChange={(e) => setBinding(b, { action: actionByName(e.target.value) as ActionDef })}
                  >
                    {ALL_ACTIONS.map((a) => (
                      <option key={a.name} value={a.name} disabled={a.name !== b.action.name && usedNames.has(a.name)}>
                        {a.description}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  <Modifiers mods={{ alt: !!b.alt, shift: !!b.shift, ctrl: !!b.ctrl }} onChange={(mods) => setBinding(b, mods)} />
                </td>
                <td>
                  <KeyInput code={b.code} onCapture={(code, mods) => setBinding(b, { code, ...mods })} />
                </td>
                <td>
                  {!noValue && (
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        step="0.1"
                        className="input input-bordered input-sm w-20"
                        value={b.value ?? b.action.value ?? 0}
                        onChange={(e) => setBinding(b, { value: Number(e.target.value) })}
                      />
                      {hasValue2 && (
                        <input
                          type="number"
                          step="1"
                          className="input input-bordered input-sm w-20"
                          value={b.value2 ?? b.action.value2 ?? 0}
                          onChange={(e) => setBinding(b, { value2: Number(e.target.value) })}
                        />
                      )}
                    </div>
                  )}
                </td>
                <td>
                  {!b.predefined && (
                    <button className="btn btn-error btn-xs" onClick={() => removeBinding(b)}>
                      X
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {available.length > 0 && (
        <button className="btn btn-primary btn-sm self-start" onClick={addBinding}>
          Add New
        </button>
      )}
    </div>
  );
};
