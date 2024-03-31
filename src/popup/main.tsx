import logo from '../../icons/icon-react-128.png';

export const Popup = () => {
  return (
    <div className="container mx-auto min-h-[200px] min-w-[250px]">
      <div className="mx-5 my-10 flex flex-col items-center gap-4">
        <div className="text-xl italic">Video UTILS</div>
        <img src={logo} className="w-16" />
        <div className="divider divider-primary my-1"></div>
        <button
          className="btn btn-primary btn-sm w-full"
          onClick={() => window.open(chrome.runtime.getURL('/src/options/index.html'))}
        >
          Options ...
        </button>
        <button
          className="btn btn-primary btn-sm w-full"
          onClick={() => window.open('https://github.com/farzadmf/videospeed/issues')}
        >
          Issues ...
        </button>
        <button className="btn btn-primary btn-sm w-full" onClick={() => window.open('https://github.com/farzadmf/videospeed')}>
          About ...
        </button>
      </div>
    </div>
  );
};
