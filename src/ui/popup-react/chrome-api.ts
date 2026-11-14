import { INVENTORY_PORT, MESSAGE_TYPES } from '@shared/constants';

function sendToActiveTab(message: unknown) {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tabId = tabs[0]?.id;
    if (tabId !== undefined) {
      chrome.tabs.sendMessage(tabId, message);
    }
  });
}

export const setSpeed = (speed: number) => sendToActiveTab({ type: MESSAGE_TYPES.SET_SPEED, payload: { speed } });

export const adjustSpeed = (delta: number) => sendToActiveTab({ type: MESSAGE_TYPES.ADJUST_SPEED, payload: { delta } });

export const runAction = (action: string) => sendToActiveTab({ type: MESSAGE_TYPES.RUN_ACTION, payload: { action } });

export const openOptions = () => chrome.runtime.openOptionsPage();

export type MediaEntry = {
  id: string;
  playing: boolean;
  speed: number;
};

export type FrameSnapshot = {
  entries: MediaEntry[];
  frameToken: string;
  isTop: boolean;
  url: string;
};

/**
 * Open the inventory port to every frame of the active tab. Chrome fans one port out
 * to all of them, and closing the popup disconnects it, which stops their reporting.
 * @param onSnapshot - called with each frame's snapshot
 * @returns a function that closes the port
 */
export function connectInventory(onSnapshot: (snapshot: FrameSnapshot) => void): () => void {
  let port: chrome.runtime.Port | undefined;
  let closed = false;

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tabId = tabs[0]?.id;
    if (tabId === undefined || closed) {
      return;
    }

    port = chrome.tabs.connect(tabId, { name: INVENTORY_PORT });
    port.onMessage.addListener((snapshot: FrameSnapshot) => onSnapshot(snapshot));

    // A page with no content script never answers; nothing to do but stop listening.
    port.onDisconnect.addListener(() => {
      port = undefined;
    });
  });

  return () => {
    closed = true;
    port?.disconnect();
  };
}

export type VscStatus =
  | { reachable: false }
  | { abort: boolean; controllerCount: number; initialized: boolean; reachable: true };

export function getStatus(): Promise<VscStatus> {
  return new Promise((resolve) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tabId = tabs[0]?.id;

      if (tabId === undefined) {
        resolve({ reachable: false });
        return;
      }

      chrome.tabs.sendMessage(tabId, { type: MESSAGE_TYPES.STATUS }, (reply) => {
        if (chrome.runtime.lastError || !reply) {
          resolve({ reachable: false });
          return;
        }
        resolve({ reachable: true, ...reply });
      });
    });
  });
}
