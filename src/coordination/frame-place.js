/**
 * Where this frame sits among the page's videos, so the popup can list videos from
 * every frame in page order.
 *
 * A place is a path, one number per frame level from the top. At each level, the
 * number is the count of that frame's videos before the child's `<iframe>`, minus 0.5,
 * which sits between the indexes of the video before it and the video after it.
 * A video's sort key is its frame's place plus its index in the frame, so a frame
 * after a frame's second video sorts between its second and third: [1.5, 0] lies
 * between [1] and [2].
 *
 * Only a direct parent can find a child's `<iframe>`, so the request goes up the
 * parent chain, each level adds its number, and the answer comes back down.
 */
import { stateManager } from '../core/state-manager.js';
import { compareFlatTreeOrder } from '../utils/dom-utils.js';
import { COORD_MSG, makeMessage, parseMessage } from './messages.js';
import { findFrameElement } from './reveal.js';

// A parent with no VSC never answers; drop the request after this long.
const ANSWER_TIMEOUT_MS = 5000;

// Deeper than any real page; a longer path is not from VSC.
const MAX_DEPTH = 16;

/** @type {Map<string, MessageEventSource>} request id -> the child that asked */
const forwards = new Map();

/** @type {Map<string, (place: number[]) => void>} request id -> this frame's own request */
const ownRequests = new Map();

function isPath(value) {
  return Array.isArray(value) && value.length <= MAX_DEPTH && value.every(Number.isFinite);
}

function askParent(path, requestId) {
  // '*' because the parent is often cross-origin; the payload is only numbers.
  window.parent.postMessage(makeMessage(COORD_MSG.PLACE_ASK, { path, requestId }), '*');
}

/** @returns {number} the count of this frame's videos before frame, minus 0.5 */
function slotOf(frame) {
  const before = stateManager.getControllerEntries().filter(({ video }) => compareFlatTreeOrder(video, frame) < 0);
  return before.length - 0.5;
}

/** @param {MessageEvent} event */
function onPlaceMessage(event) {
  const msg = parseMessage(event.data);
  const { path, requestId } = msg?.payload ?? {};
  if (!event.source || typeof requestId !== 'string' || !isPath(path)) {
    return;
  }

  if (msg.type === COORD_MSG.PLACE_ASK) {
    const frame = findFrameElement(document, event.source);
    if (!frame) {
      return;
    }

    const placed = [slotOf(frame), ...path];
    if (window === window.top) {
      event.source.postMessage(makeMessage(COORD_MSG.PLACE_ANSWER, { path: placed, requestId }), '*');
      return;
    }

    forwards.set(requestId, event.source);
    setTimeout(() => forwards.delete(requestId), ANSWER_TIMEOUT_MS);
    askParent(placed, requestId);
    return;
  }

  // Only the parent holds the answer to a request this frame sent up.
  if (msg.type === COORD_MSG.PLACE_ANSWER && event.source === window.parent) {
    ownRequests.get(requestId)?.(path);

    const child = forwards.get(requestId);
    forwards.delete(requestId);
    child?.postMessage(makeMessage(COORD_MSG.PLACE_ANSWER, { path, requestId }), '*');
  }
}

/** @returns {Promise<number[]|null>} this frame's place, or null when no answer came */
export function requestPlace() {
  if (window === window.top) {
    return Promise.resolve([]);
  }

  const requestId = Math.random().toString(36).slice(2, 10);

  return new Promise((resolve) => {
    const done = (place) => {
      clearTimeout(timer);
      ownRequests.delete(requestId);
      resolve(place);
    };
    const timer = setTimeout(() => done(null), ANSWER_TIMEOUT_MS);

    ownRequests.set(requestId, done);
    askParent([], requestId);
  });
}

/** Answer and relay place requests from child frames. Runs in every frame, even one with no videos. */
export function installPlaceRelay() {
  window.addEventListener('message', onPlaceMessage, false);
}
