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

export const play = () => sendToActiveTab({ type: MESSAGE_TYPES.PLAY });

export const pause = () => sendToActiveTab({ type: MESSAGE_TYPES.PAUSE });

export const openOptions = () => chrome.runtime.openOptionsPage();
