export const Popup = () => {
  return (
    <>
      <div>POPUP APP!</div>
      <button onClick={() => window.open(chrome.runtime.getURL('/src/options/index.html'))}>
        Settings ...
      </button>
      <button
        onClick={() =>
          chrome.storage.sync.set({ hello: 'there' }, () => {
            console.log('SAVED???!!');
          })
        }
      >
        Save!
      </button>
    </>
  );
};
