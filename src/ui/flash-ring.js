import ringCss from '../styles/flash_ring.css';

// Shared with the controller pulse, so the two start and end together.
export const FLASH_MS = 600;

/**
 * Pulse the controller pill in step with the ring. A hidden pill stays hidden, since
 * the animation changes only size and glow.
 * @param {HTMLElement} pill
 * @param {string} color - The flashRing colour
 * @returns {Animation}
 */
export function pulse(pill, color) {
  // Anchored at the top left, so the pill grows into the video, not off its edge.
  return pill.animate(
    [
      { transform: 'scale(1)', transformOrigin: 'top left' },
      { boxShadow: `0 0 6px 3px ${color}`, offset: 0.25, transform: 'scale(1.15)', transformOrigin: 'top left' },
      { transform: 'scale(1)', transformOrigin: 'top left' },
    ],
    { duration: FLASH_MS, easing: 'ease-out' }
  );
}

/**
 * A ring drawn over a video to show which one an action reached.
 *
 * It is a separate element from the controller, so a hidden controller (startHidden)
 * keeps the ring visible. It anchors to the video's anchor name, so the browser sizes
 * it to the video and moves it on scroll with no JS.
 */
export class FlashRing {
  /**
   * @param {HTMLMediaElement} video
   * @param {string} anchorName - The anchor-name already set on the video
   * @param {{color: string, failureColor: string, width: number}} look - The flashRing setting
   */
  constructor(video, anchorName, { color, failureColor, width }) {
    this.host = document.createElement('vsc-flash');
    this.failureColor = failureColor;
    this.animation = null;

    // Inline, so the page's styles and the shadow sheet's `all: initial` cannot undo it.
    const styles = {
      '--vsc-flash-color': color,
      '--vsc-flash-width': `${width}px`,
      bottom: 'anchor(bottom)',
      left: 'anchor(left)',
      'pointer-events': 'none',
      position: 'fixed',
      'position-anchor': anchorName,
      'position-visibility': 'anchors-visible',
      right: 'anchor(right)',
      top: 'anchor(top)',
      'z-index': '2147483646',
    };
    for (const [name, value] of Object.entries(styles)) {
      this.host.style.setProperty(name, value);
    }

    const shadow = this.host.attachShadow({ mode: 'open' });
    const style = document.createElement('style');
    style.textContent = ringCss;
    this.ring = document.createElement('div');
    this.ring.className = 'ring';
    shadow.append(style, this.ring);

    // Anchor names are tree-scoped: the ring must share the video's tree to resolve one.
    const root = video.getRootNode();
    (root instanceof ShadowRoot ? root : document.body).appendChild(this.host);
  }

  /** One fade in and out. A new flash replaces one still running. */
  flash() {
    this.animation?.cancel();
    this.animation = this.ring.animate([{ opacity: 0 }, { offset: 0.25, opacity: 1 }, { opacity: 0 }], {
      duration: FLASH_MS,
      easing: 'ease-out',
    });
  }

  /**
   * Two blips in a warning colour, in the same time as one success flash. The repeat,
   * not only the colour, tells it apart, so it reads without colour vision.
   */
  flashFailure() {
    this.animation?.cancel();
    this.animation = this.ring.animate(
      [0, 1, 0, 1, 0].map((opacity, i) => ({ borderColor: this.failureColor, offset: i / 4, opacity })),
      { duration: FLASH_MS }
    );
  }

  remove() {
    this.animation?.cancel();
    this.host.remove();
  }
}
