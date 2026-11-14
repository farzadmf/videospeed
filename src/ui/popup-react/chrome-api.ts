import { INVENTORY_KIND, INVENTORY_PORT, MESSAGE_TYPES } from '@shared/constants';

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
  inView: boolean;
  /** '' when the page provides none; the popup names it by position */
  label: string;
  playing: boolean;
  speed: number;
  /** pixels visible in the top-level viewport */
  visibleArea: number;
};

export type FrameSnapshot = {
  entries: MediaEntry[];
  frameToken: string;
  isTop: boolean;
  kind: typeof INVENTORY_KIND.SNAPSHOT;
  /** Where the frame sits among the page's videos, one number per frame level; null until known */
  place: number[] | null;
  url: string;
};

export type CommandOutcome = {
  action: VideoAction;
  commandId: number;
  kind: typeof INVENTORY_KIND.OUTCOME;
  outcome: 'applied' | 'refused' | 'unknown-target';
  target: string;
};

/** A popup action, named the way the page's action handler names it. */
export type VideoAction = {
  name: string;
  value?: number;
};

type InventoryHandlers = {
  onOutcome: (outcome: CommandOutcome) => void;
  onSnapshot: (snapshot: FrameSnapshot) => void;
};

/**
 * Open the inventory port to every frame of the active tab. Chrome fans one port out
 * to all of them, and closing the popup disconnects it, which stops their reporting.
 * @returns `close` to close the port, and `sendCommand` to act on one video
 */
export function connectInventory({ onOutcome, onSnapshot }: InventoryHandlers) {
  let port: chrome.runtime.Port | undefined;
  let closed = false;

  // A key pressed in the moment between the popup opening and the port existing
  // would otherwise be lost.
  const pending: unknown[] = [];

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tabId = tabs[0]?.id;
    if (tabId === undefined || closed) {
      return;
    }

    port = chrome.tabs.connect(tabId, { name: INVENTORY_PORT });
    port.onMessage.addListener((message: CommandOutcome | FrameSnapshot) => {
      if (message.kind === INVENTORY_KIND.OUTCOME) {
        onOutcome(message);
      } else {
        onSnapshot(message);
      }
    });

    // A page with no content script never answers; nothing to do but stop listening.
    port.onDisconnect.addListener(() => {
      port = undefined;
    });

    for (const message of pending.splice(0)) {
      port.postMessage(message);
    }
  });

  return {
    close: () => {
      closed = true;
      port?.disconnect();
    },

    // Every frame receives it; only the frame that owns the target acts, and it echoes
    // commandId back so the outcome can be matched to this command.
    sendCommand: (commandId: number, target: string, action: VideoAction) => {
      const message = { action, commandId, target, type: MESSAGE_TYPES.INVENTORY_COMMAND };
      if (port) {
        port.postMessage(message);
      } else if (!closed) {
        pending.push(message);
      }
    },
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
