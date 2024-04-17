export const App = () => {
  const hello = () => {
    alert('boo boo 3');
  };

  return (
    <div className="t-absolute t-bottom-[105px] t-left-[100px] t-z-[99] t-w-1/2 t-text-2xl">
      <div className="t-bg-slate-500 t-text-lg">one box</div>
      <div className="t-flex t-flex-col">
        <div>two box</div>
        <div>three box</div>
      </div>
      <button className="t-d-btn t-d-btn-primary" onClick={hello}>
        PLEASE
      </button>
    </div>
  );
};
