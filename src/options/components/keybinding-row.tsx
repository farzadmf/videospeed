import { KeyBinding } from '../types';
import { Actions } from './actions';
import { useState } from 'react';

export const KeybindingRow = ({ binding }: { binding: KeyBinding }) => {
  const [hasShift, setHasShift] = useState(!!binding.shift);
  const [hasCtrl, setHasCtrl] = useState(!!binding.ctrl);
  const [isForced, setIsForced] = useState(!!binding.force);

  const { action, predefined } = binding;

  return (
    <tr>
      <td>
        <Actions value={action.name} />
      </td>
      <td className="flex flex-col gap-2">
        <label className="label cursor-pointer place-content-start gap-2 p-0">
          <input
            type="checkbox"
            checked={hasShift}
            onChange={() => setHasShift(!hasShift)}
            className="checkbox checkbox-primary"
          />
          <span className="label-text">SHIFT</span>
        </label>
        <label className="label cursor-pointer place-content-start gap-2 p-0">
          <input type="checkbox" checked={hasCtrl} onChange={() => setHasCtrl(!hasCtrl)} className="checkbox checkbox-primary" />
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
            checked={isForced}
            onChange={() => setIsForced(!isForced)}
            className="checkbox checkbox-primary"
          />
          <span className="label-text">Disable Website key bindings</span>
        </label>
      </td>
      <td>{predefined || <p>REMOVE!!!</p>}</td>
    </tr>
  );
};
