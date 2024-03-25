import { useEffect, useState } from 'react';

export const Options = () => {
  const [hello, setHello] = useState('');

  useEffect(() => {
    chrome.storage.sync.get('hello', (items) => {
      setHello(items['hello']);
    });
  }, []);

  return (
    <div className="h-dvh grid place-content-center content-start gap-4 my-10">
      <h1 className="text-2xl text-white">Options</h1>
      <p>Hello is {hello}</p>
    </div>
  );
};
