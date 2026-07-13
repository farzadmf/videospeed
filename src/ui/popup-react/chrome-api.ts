// Must match the content script's message contract.
const MessageTypes = {
  SET_SPEED: 'VSC_SET_SPEED',
  ADJUST_SPEED: 'VSC_ADJUST_SPEED',
} as const;

function sendToActiveTab(message: unknown) {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]?.id != null) {
      chrome.tabs.sendMessage(tabs[0].id, message);
    }
  });
}

export const setSpeed = (speed: number) => sendToActiveTab({ type: MessageTypes.SET_SPEED, payload: { speed } });

export const adjustSpeed = (delta: number) => sendToActiveTab({ type: MessageTypes.ADJUST_SPEED, payload: { delta } });

export const openOptions = () => chrome.runtime.openOptionsPage();
