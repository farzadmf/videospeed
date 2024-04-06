import { ACTIONS } from '@shared/.';
import _ from 'lodash';
import { useState } from 'react';

export const Actions = ({ value }: { value?: string }) => {
  const [selected, setSelected] = useState(value);

  return (
    <select value={selected} onChange={(e) => setSelected(e.target.value)} className="select select-primary select-sm w-3/4">
      {_.map(ACTIONS, ({ name, description }) => (
        <option key={name} value={name}>
          {description}
        </option>
      ))}
    </select>
  );
};
