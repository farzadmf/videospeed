import { useEffect } from 'react';

export const Options = () => {
  useEffect(() => {
    chrome.storage.sync.get('hello', (items) => {
      console.log(items);
    });
  }, []);

  return (
    <>
      <h1 className="text-2xl">OPTIONS APP!</h1>
    </>
  );
};
