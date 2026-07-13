import { useEffect, useState } from 'react';

// Must match the content script's message contract.
const MessageTypes = {
  SET_SPEED: 'VSC_SET_SPEED',
  ADJUST_SPEED: 'VSC_ADJUST_SPEED',
} as const;

const PRESETS = [0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0, 2.5];

function sendToActiveTab(message: unknown) {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]?.id != null) {
      chrome.tabs.sendMessage(tabs[0].id, message);
    }
  });
}

export const App = () => {
  const [enabled, setEnabled] = useState(true);
  const [status, setStatus] = useState('');

  const [slowerStep, setSlowerStep] = useState(0.1);
  const [fasterStep, setFasterStep] = useState(0.1);
  const [resetSpeed, setResetSpeed] = useState(1.0);

  useEffect(() => {
    chrome.storage.sync.get(null, (storage) => {
      setEnabled(storage.enabled !== false);

      const bindings = Array.isArray(storage.keyBindings) ? storage.keyBindings : [];
      const valueOf = (action: string, fallback: number) => {
        const b = bindings.find((kb: { action?: string; value?: unknown }) => kb.action === action);
        return typeof b?.value === 'number' ? b.value : fallback;
      };

      setSlowerStep(valueOf('slower', 0.1));
      setFasterStep(valueOf('faster', 0.1));
      setResetSpeed(valueOf('fast', 1.0));
    });
  }, []);

  const toggleEnabled = () => {
    const next = !enabled;
    chrome.storage.sync.set({ enabled: next }, () => {
      setEnabled(next);
      setStatus(`${next ? 'Enabled' : 'Disabled'}. Reload page.`);
    });
  };

  const setSpeed = (speed: number) => sendToActiveTab({ type: MessageTypes.SET_SPEED, payload: { speed } });
  const adjustSpeed = (delta: number) => sendToActiveTab({ type: MessageTypes.ADJUST_SPEED, payload: { delta } });

  return (
    <div className="popup-container">
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

      <div className="footer">
        <div className="footer-content">
          {status && <div className="status">{status}</div>}
          <div className="footer-controls">
            <button
              className={`icon-btn power-btn${enabled ? '' : ' disabled'}`}
              title={enabled ? 'Disable Extension' : 'Enable Extension'}
              onClick={toggleEnabled}
            >
              ⏻
            </button>
            <button className="icon-btn settings-btn" title="Settings" onClick={() => chrome.runtime.openOptionsPage()}>
              ⚙
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
