import { useState } from 'react';
import { KeyBinding } from '../types';
import { Actions } from './actions';

export const KeybindingRow = ({ binding }: { binding: KeyBinding }) => {
  const [hasShift, setHasShift] = useState(!!binding.shift);
  const [hasCtrl, setHasCtrl] = useState(!!binding.ctrl);

  return (
    <tr>
      <td>
        <Actions value={binding.action.name} />
      </td>
      <td className="flex flex-col gap-2">
        <div className="flex gap-2">
          <input type="checkbox" checked={hasShift} onChange={() => setHasShift(!hasShift)} />
          <label>SHIFT</label>
        </div>
        <div className="flex gap-2">
          <input type="checkbox" checked={hasCtrl} onChange={() => setHasCtrl(!hasCtrl)} />
          <label>CTRL</label>
        </div>
      </td>
      <td>{binding.key}</td>
      <td>
        <input type="text" placeholder="value (0.10)" className="input input-sm input-primary" />
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
    </tr>
  );
};
