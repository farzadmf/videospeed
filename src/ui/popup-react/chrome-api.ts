import { MESSAGE_TYPES } from '@shared/constants';

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
