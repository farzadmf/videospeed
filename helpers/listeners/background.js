chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Sender verification - only accept messages from our extension
  if (!sender.id || sender.id !== chrome.runtime.id) {
    return;
  }

  // Handle namespaced VSC message types
  if (typeof message === 'object' && message.type && message.type.startsWith('VSC_')) {
    const videos = document.querySelectorAll('video');

    switch (message.type) {
      case 'VSC_SET_SPEED':
        if (message.payload && typeof message.payload.speed === 'number') {
          const targetSpeed = message.payload.speed;
          videos.forEach((video) => {
            if (video.vsc) {
              setSpeed(video, targetSpeed);
            } else {
              video.playbackRate = targetSpeed;
            }
          });
        }
        break;

      case 'VSC_ADJUST_SPEED':
        if (message.payload && typeof message.payload.delta === 'number') {
          const delta = message.payload.delta;
          videos.forEach((video) => {
            const newSpeed = Math.min(Math.max(video.playbackRate + delta, 0.07), 16);
            if (video.vsc) {
              setSpeed(video, newSpeed);
            } else {
              video.playbackRate = newSpeed;
            }
          });
        }
        break;

      case 'VSC_RESET_SPEED':
        videos.forEach((video) => {
          if (video.vsc) {
            resetSpeed(video, 1.0);
          } else {
            video.playbackRate = 1.0;
          }
        });
        break;

      case 'VSC_TOGGLE_DISPLAY':
        runAction('display', null, null);
        break;
    }
  }

  // Handle legacy speed multiplier messages
  if (message === 'slow-down-01') {
    speedMod(0.1);
  } else if (message === 'slow-down-02') {
    speedMod(0.2);
  } else if (message === 'slow-down-04') {
    speedMod(0.4);
  } else if (message === 'slow-down-06') {
    speedMod(0.6);
  } else if (message === 'slow-down-08') {
    speedMod(0.8);
  } else if (message === 'speed-up-12') {
    speedMod(1.2);
  } else if (message === 'speed-up-14') {
    speedMod(1.4);
  } else if (message === 'speed-up-16') {
    speedMod(1.6);
  } else if (message === 'speed-up-18') {
    speedMod(1.8);
  } else if (message === 'speed-up-20') {
    speedMod(2.0);
  }
});

const speedMod = (multiplier) => {
  document.querySelectorAll('video, audio').forEach((media) => {
    try {
      media.playbackRate *= multiplier;
      log('Playback rate changed to ' + media.playbackRate, INFO);
    } catch (e) {
      log(e, ERROR);
    }
  });
};
