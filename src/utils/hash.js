/**
 * SHA-256 hash prefix helper for SponsorBlock's privacy-preserving API.
 * @param {string} input - String to hash.
 * @param {number} chars - Number of leading hex chars to return.
 * @returns {Promise<string>} Uppercase hex prefix.
 */
export async function hashPrefix(input, chars) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, chars);
}
