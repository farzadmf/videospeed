import { useEffect, useRef, useState } from 'react';

// Shows what :host(...) means. We make a real shadow DOM. Inside it is a pill.
// The pill's color is decided by a CSS rule that only applies when the OUTSIDE
// host element has the class "anchored" — exactly like :host(.vsc-anchored).

const SHADOW_CSS = `
  .pill {
    background: #444;
    color: white;
    padding: 8px 12px;
    border-radius: 6px;
    font-family: monospace;
    display: inline-block;
  }
  /* This rule reaches the pill ONLY when the host element has class "anchored" */
  :host(.anchored) .pill {
    background: #2e7d32;
  }
`;

export function ShadowHostDemo() {
  const hostRef = useRef<HTMLDivElement>(null);
  const [anchored, setAnchored] = useState(false);

  // Build the shadow tree once.
  useEffect(() => {
    const host = hostRef.current;
    if (!host || host.shadowRoot) return;
    const shadow = host.attachShadow({ mode: 'open' });
    const style = document.createElement('style');
    style.textContent = SHADOW_CSS;
    const pill = document.createElement('div');
    pill.className = 'pill';
    pill.textContent = '1.50x ◀ ▶';
    shadow.append(style, pill);
  }, []);

  // Toggle the class on the HOST (outside the shadow). The inside reacts.
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    host.classList.toggle('anchored', anchored);
  }, [anchored]);

  return (
    <div>
      <div className="demo__controls">
        <label>
          <input type="checkbox" checked={anchored} onChange={(e) => setAnchored(e.target.checked)} /> add class{' '}
          <code>anchored</code> to the host
        </label>
      </div>
      <div className="shadowhost" ref={hostRef} />
      <p className="demo__hint">
        The pill lives inside a shadow DOM. The checkbox changes a class on the OUTSIDE box. The green color comes from a{' '}
        <code>:host(.anchored)</code> rule inside the shadow.
      </p>
    </div>
  );
}
