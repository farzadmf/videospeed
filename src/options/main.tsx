// import { useEffect, useState } from 'react';
import { KeybindingRow } from './components/keybinding-row';
import { defaultOptions } from './defaults';
import _ from 'lodash';

export const Options = () => {
  // const [hello, setHello] = useState('');
  const options = defaultOptions;

  // useEffect(() => {
  //   chrome.storage.sync.get('hello', (items) => {
  //     setHello(items['hello']);
  //   });
  // }, []);

  return (
    <div className="container mx-auto flex flex-col items-center">
      <h1 className="text-3xl text-white">Options</h1>
      <div className="divider divider-primary my-1"></div>
      <table className="table table-zebra-zebra">
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
