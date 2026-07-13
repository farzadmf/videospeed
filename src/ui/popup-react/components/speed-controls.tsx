import { LuMinus, LuPlus } from 'react-icons/lu';

import { adjustSpeed, setSpeed } from '../chrome-api';

const PRESETS = [0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0, 2.5];

type Props = {
  slowerStep: number;
  fasterStep: number;
  resetSpeed: number;
};

export const SpeedControls = ({ slowerStep, fasterStep, resetSpeed }: Props) => (
  <div className="flex flex-col gap-4 p-5">
    <div className="grid grid-cols-3 gap-2">
      <button className="btn btn-soft btn-primary" onClick={() => adjustSpeed(-slowerStep)}>
        <LuMinus /> {slowerStep}
      </button>
      <button
        className="btn btn-primary hover:bg-primary-content hover:text-primary font-bold"
        onClick={() => setSpeed(resetSpeed)}
      >
        {resetSpeed}
      </button>
      <button className="btn btn-soft btn-primary" onClick={() => adjustSpeed(fasterStep)}>
        <LuPlus /> {fasterStep}
      </button>
    </div>

    <div className="grid grid-cols-4 gap-2">
      {PRESETS.map((speed) => (
        <button key={speed} className="btn btn-sm btn-soft btn-primary" onClick={() => setSpeed(speed)}>
          {speed}
        </button>
      ))}
    </div>
  </div>
);
