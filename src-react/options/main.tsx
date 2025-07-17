import { KeybindingRow } from './components/keybinding-row';
import { defaultOptions } from './defaults';
import { KeyBinding, Options } from './types';
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

  const onUpdate = (binding: KeyBinding) => {
    const idx = _.findIndex(options.keyBindings, (b) => b.action.name === binding.action.name);
    options.keyBindings[idx] = binding;

    console.log(options.keyBindings[idx]);
    setOptions(_.cloneDeep(options));
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
            <th>REMOVE</th>
          </tr>
        </thead>
        <tbody>
          {_.sortBy(options.keyBindings, (b) => b.action.description).map((b, idx) => (
            <KeybindingRow key={idx} binding={b} onUpdate={onUpdate} />
          ))}
        </tbody>
      </table>
    </div>
  );
};
