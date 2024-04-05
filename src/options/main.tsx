import { KeybindingRow } from './components/keybinding-row';
import { defaultOptions } from './defaults';
import { Options } from './types';
import _ from 'lodash';
import { useEffect, useState } from 'react';

export const OptionsPage = () => {
  const [options, setOptions] = useState(defaultOptions);

  useEffect(() => {
    chrome.storage.local.get(defaultOptions, (items) => {
      setOptions(items as Options);
    });
  }, []);

  const clearStorage = () => {
    chrome.storage.local.clear(() => setOptions(defaultOptions));
  };

  return (
    <div className="container mx-auto flex flex-col items-center">
      <button className="btn btn-sm btn-secondary mt-5" onClick={clearStorage}>
        CLEAR STORAGE!!!
      </button>
      <hr />
      <h1 className="text-3xl text-white">Options</h1>
      <div className="divider divider-primary my-1"></div>
      <table className="table table-zebra-zebra table-pin-rows">
        <thead>
          <tr>
            <th>COMMAND</th>
            <th>MODIFIERS</th>
            <th>KEY</th>
            <th>VALUE(S)</th>
            <th>OPTIONS</th>
            <th>OTHER</th>
          </tr>
        </thead>
        <tbody>
          {_.sortBy(options.keyBindings, (b) => b.action.description).map((b, idx) => (
            <KeybindingRow key={idx} binding={b} />
          ))}
        </tbody>
      </table>
    </div>
  );
};
