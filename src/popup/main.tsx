export const Popup = () => {
  return (
    <div className="container mx-auto min-h-[200px] min-w-[250px]">
      <div className="my-10 grid grid-cols-1 items-center justify-items-center">
        <button
          className="btn btn-primary btn-sm my-5 w-8/12"
          onClick={() => window.open(chrome.runtime.getURL('/src/options/index.html'))}
        >
          Options ...
        </button>
        <button
          className="btn btn-primary btn-sm my-5 w-8/12"
          onClick={() => window.open('https://github.com/farzadmf/videospeed/issues')}
        >
          Issues ...
        </button>
        <button
          className="btn btn-primary btn-sm my-5 w-8/12"
          onClick={() => window.open('https://github.com/farzadmf/videospeed')}
        >
          About ...
        </button>
      </div>
    </div>
  );
};
