/**
 * Converts a number value to CSS px string
 * @param {number} value - Value to convert
 * @returns {string} CSS px string
 */
export function toPx(value) {
  return `${value}px`;
}

/**
 * Formats a duration in seconds to a string in the format "HH:MM:SS"
 * @param {number} secs - Duration in seconds
 * @returns {string} Formatted duration string
 */
export function formatDuration({ secs, hourAlwaysVisible = false }) {
  const pad = (num) => num.toString().padStart(2, '0');

  const hours = pad(Math.floor(secs / 3600));
  const minutes = pad(Math.floor((secs % 3600) / 60));
  const seconds = pad(Math.floor(secs % 60));

  if (hours > 0 || hourAlwaysVisible) return `${hours}:${minutes}:${seconds}`;
  return `${minutes}:${seconds}`;
}
