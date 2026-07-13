import { adjustSpeed, setSpeed } from '../chrome-api';

const PRESETS = [0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0, 2.5];

type Props = {
  slowerStep: number;
  fasterStep: number;
  resetSpeed: number;
};

export const SpeedControls = ({ slowerStep, fasterStep, resetSpeed }: Props) => (
  <div className="speed-section">
    <div className="speed-controls">
      <button className="control-btn" onClick={() => adjustSpeed(-slowerStep)}>
        <span>-{slowerStep}</span>
      </button>
      <button className="control-btn reset-btn" onClick={() => setSpeed(resetSpeed)}>
        {resetSpeed}
      </button>
      <button className="control-btn" onClick={() => adjustSpeed(fasterStep)}>
        <span>+{fasterStep}</span>
      </button>
    </div>

    <div className="speed-presets">
      <div className="preset-grid">
        {PRESETS.map((speed) => (
          <button key={speed} className="preset-btn" onClick={() => setSpeed(speed)}>
            {speed}
          </button>
        ))}
      </div>
    </div>
  </div>
);
