import { KeyBinding } from '../types';
import { RiDeleteBinFill } from 'react-icons/ri';

export const KeybindingRow = ({ binding, onUpdate }: { onUpdate: (binding: KeyBinding) => void; binding: KeyBinding }) => {
  const { action, predefined } = binding;

  return (
    <tr>
      <td>
        <input type="text" readOnly className="input input-sm input-primary w-3/4" defaultValue={action.name} />
        {/*<label className="label">{action.name}</label>*/}
      </td>
      <td className="flex flex-col gap-2">
        <label className="label cursor-pointer place-content-start gap-2 p-0">
          <input
            type="checkbox"
            checked={Boolean(binding.shift)}
            onChange={() => onUpdate({ ...binding, shift: !binding.shift })}
            className="checkbox checkbox-primary"
          />
          <span className="label-text">SHIFT</span>
        </label>
        <label className="label cursor-pointer place-content-start gap-2 p-0">
          <input
            type="checkbox"
            checked={Boolean(binding.ctrl)}
            onChange={() => onUpdate({ ...binding, ctrl: !binding.ctrl })}
            className="checkbox checkbox-primary"
          />
          <span className="label-text">CTRL</span>
        </label>
      </td>
      <td>{binding.key}</td>
      <td>
        {action.value && <input type="text" placeholder="value (0.10)" className="input input-sm input-primary" />}
        {binding.value2 && (
          <>
            <span>{binding.preValueText}</span>
            <input type="text" placeholder="value 2 pre text" />
            <span>{binding.postValueText}</span>
            <input type="text" placeholder="value 2 post text" />
            <span>{binding.postValue2Text}</span>
          </>
        )}
      </td>
      <td>
        <label className="label cursor-pointer place-content-start gap-2">
          <input
            type="checkbox"
            checked={Boolean(binding.force)}
            onChange={() => onUpdate({ ...binding, force: !binding.force })}
            className="checkbox checkbox-primary"
          />
          <span className="label-text">Disable Website key bindings</span>
        </label>
      </td>
      <td>
        {predefined || (
          <button className="text-3xl text-red-500">
            <RiDeleteBinFill />
          </button>
        )}
      </td>
    </tr>
  );
};
