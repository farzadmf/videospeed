import { LuFastForward, LuPause, LuPlay, LuRewind } from 'react-icons/lu';

import { adjustSpeed, pause, play, runAction, setSpeed } from '../chrome-api';

const PRESETS = [1, 2, 3, 4];

type Props = {
  slowerStep: number;
  fasterStep: number;
};

export const SpeedControls = ({ slowerStep, fasterStep }: Props) => (
  <div className="flex flex-col gap-3 p-4">
    <div className="grid grid-cols-6 gap-1">
      <button className="btn btn-soft btn-primary px-1" onClick={() => adjustSpeed(-slowerStep)}>
        -{slowerStep}
      </button>
      {PRESETS.map((speed) => (
        <button key={speed} className="btn btn-soft btn-accent text-base-content px-1" onClick={() => setSpeed(speed)}>
          {speed}x
        </button>
      ))}
      <button className="btn btn-soft btn-primary px-1" onClick={() => adjustSpeed(fasterStep)}>
        +{fasterStep}
      </button>
    </div>

    <div className="grid grid-cols-4 gap-1">
      <button className="btn btn-soft btn-secondary" title="Rewind" onClick={() => runAction('rewind')}>
        <LuRewind size={18} />
      </button>
      <button className="btn btn-soft btn-secondary" title="Play" onClick={play}>
        <LuPlay size={18} />
      </button>
      <button className="btn btn-soft btn-secondary" title="Pause" onClick={pause}>
        <LuPause size={18} />
      </button>
      <button className="btn btn-soft btn-secondary" title="Forward" onClick={() => runAction('advance')}>
        <LuFastForward size={18} />
      </button>
    </div>
  </div>
);
