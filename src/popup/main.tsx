import { useState } from 'react';

export const Popup = () => {
  const [val, setVal] = useState('');

  return (
    <div className="my-10 grid min-h-[400px] min-w-[250px] place-content-center content-start items-start gap-4">
      <button
        className="btn btn-primary btn-sm"
        onClick={() => window.open(chrome.runtime.getURL('/src/options/index.html'))}
      >
        Settings ...
      </button>
      <input
        className="rounded border text-base"
        value={val}
        onChange={(e) => setVal(e.target.value)}
      />
      <button
        className="btn btn-primary btn-sm"
        onClick={() =>
          chrome.storage.sync.set({ hello: val }, () => {
            console.log('SAVED???!!');
          })
        }
      >
        Save!
      </button>
    </div>
  );
};
