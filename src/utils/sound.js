import { logger } from './logger.js';

/**
 * Play the beep sound at a fraction of the given volume.
 * @param {string} url - URL of the sound file
 * @param {number} videoVolume - Current video volume (0–1)
 */
export function playBeep(url, videoVolume) {
  if (!url) {
    logger.debug('[playBeep] No sound URL available');
    return;
  }

  try {
    const beep = new Audio(url);
    beep.volume = videoVolume * 0.1;
    beep.play();
    beep.addEventListener('ended', () => beep.remove());
  } catch (err) {
    logger.debug('[playBeep] Failed to play beep:', err.message);
  }
}
