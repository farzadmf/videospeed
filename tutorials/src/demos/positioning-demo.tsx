import { useEffect, useRef, useState } from 'react';

// A tiny model of what VSC does: a "video" box inside a scrollable page, and a
// "controller" pill that has to stay glued to the video's top-left corner.
//
// Two modes:
//   - "js": we listen to scroll and re-measure the video every frame, then move
//           the pill by hand. This mimics the old shadowManager.adjustLocation().
//   - "anchor": we let CSS anchor positioning glue the pill to the video. No JS
//           runs on scroll. This mimics enableAnchorPositioning().
//
// A counter shows how many times JS had to move the pill, so you can SEE the
// difference in work between the two modes.

type Mode = 'js' | 'anchor';

const supportsAnchor =
  typeof CSS !== 'undefined' && typeof CSS.supports === 'function' && CSS.supports('anchor-name', '--a');

export function PositioningDemo() {
  const [mode, setMode] = useState<Mode>('js');
  const scrollRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLDivElement>(null);
  const pillRef = useRef<HTMLDivElement>(null);
  const [jsMoves, setJsMoves] = useState(0);

  // JS mode: measure the video and place the pill by hand, on every scroll.
  useEffect(() => {
    const scroller = scrollRef.current;
    const video = videoRef.current;
    const pill = pillRef.current;
    if (!scroller || !video || !pill) return;

    if (mode === 'anchor') {
      // Hand control to CSS: clear inline placement, set the anchor link.
      // Use setProperty for these new props (same style the real VSC code uses).
      video.style.setProperty('anchor-name', '--demo-video');
      pill.style.position = 'absolute';
      pill.style.setProperty('position-anchor', '--demo-video');
      pill.style.top = 'anchor(top)';
      pill.style.left = 'anchor(left)';
      return;
    }

    // JS mode: remove anchor wiring and move the pill ourselves.
    video.style.removeProperty('anchor-name');
    pill.style.position = 'absolute';
    pill.style.removeProperty('position-anchor');

    const place = () => {
      const v = video.getBoundingClientRect();
      const s = scroller.getBoundingClientRect();
      pill.style.top = `${v.top - s.top + scroller.scrollTop}px`;
      pill.style.left = `${v.left - s.left + scroller.scrollLeft}px`;
      setJsMoves((n) => n + 1);
    };

    place();
    scroller.addEventListener('scroll', place);
    return () => scroller.removeEventListener('scroll', place);
  }, [mode]);

  return (
    <div>
      <div className="demo__controls">
        <label>
          <input type="radio" checked={mode === 'js'} onChange={() => setMode('js')} /> JS observer (old way)
        </label>
        <label>
          <input
            type="radio"
            checked={mode === 'anchor'}
            onChange={() => setMode('anchor')}
            disabled={!supportsAnchor}
          />{' '}
          CSS anchor (new way){!supportsAnchor && ' — your browser does not support it'}
        </label>
        <span className="demo__counter">
          JS moved the pill <strong>{jsMoves}</strong> times
          {mode === 'anchor' && ' (not counting now — CSS is doing it)'}
        </span>
      </div>

      <div className="demo__scroller" ref={scrollRef}>
        <div className="demo__tall">
          <div className="demo__video" ref={videoRef}>
            video
          </div>
          <div className="demo__pill" ref={pillRef}>
            1.50x ◀ ▶
          </div>
        </div>
      </div>
      <p className="demo__hint">Scroll inside the gray box. Watch the counter, and watch the pill stay on the video.</p>
    </div>
  );
}
