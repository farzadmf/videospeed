import { ACTIONS } from '../../shread/all-actions';
import _ from 'lodash';

export const Actions = ({ value }: { value?: string }) => (
  <select value={value} className="select select-primary select-sm w-3/4">
    {_.map(ACTIONS, ({ name, description }) => (
      <option value={name}>{description}</option>
    ))}
  </select>
);
