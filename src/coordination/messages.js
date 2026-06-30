/**
 * Cross-frame message protocol for the VSC coordinator.
 *
 * Transport: window.postMessage in a flat star — every frame posts to
 * window.top, the hub replies via event.source. Messages are namespaced with
 * VSC_COORD_TAG and untagged traffic is ignored.
 */

export const VSC_COORD_TAG = '__vsc_coord__';

// Message types. SPOKE -> HUB unless noted.
export const COORD_MSG = {
  // Spoke announces its presence / heartbeat (frame just initialized).
  HELLO: 'hello',
  // Spoke reports its current local controller (video) count changed.
  CONTROLLERS: 'controllers',
  // Spoke forwards a captured key intent for the hub to route.
  KEY_INTENT: 'key_intent',
  // HUB -> SPOKE: the routing decision ("you should handle this key").
  ROUTE: 'route',
};

/**
 * Build a tagged envelope.
 * @param {string} type - one of COORD_MSG
 * @param {object} payload - message body
 * @returns {object} envelope
 */
export function makeMessage(type, payload) {
  return { [VSC_COORD_TAG]: true, type, payload: payload || {} };
}

/**
 * Validate + unwrap an incoming postMessage data blob.
 * @param {*} data - event.data from a message event
 * @returns {{type: string, payload: object} | null} unwrapped message, or null
 */
export function parseMessage(data) {
  if (!data || typeof data !== 'object' || data[VSC_COORD_TAG] !== true) {
    return null;
  }
  if (typeof data.type !== 'string') {
    return null;
  }
  return { type: data.type, payload: data.payload || {} };
}
