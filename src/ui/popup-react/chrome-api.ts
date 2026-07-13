import { MESSAGE_TYPES } from '@shared/constants';

function sendToActiveTab(message: unknown) {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]?.id != null) {
      chrome.tabs.sendMessage(tabs[0].id, message);
    }
  });
}

export const setSpeed = (speed: number) => sendToActiveTab({ type: MESSAGE_TYPES.SET_SPEED, payload: { speed } });

export const adjustSpeed = (delta: number) => sendToActiveTab({ type: MESSAGE_TYPES.ADJUST_SPEED, payload: { delta } });

export const openOptions = () => chrome.runtime.openOptionsPage();
