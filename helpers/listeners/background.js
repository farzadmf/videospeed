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

chrome.runtime.onMessage.addListener((req, snd, rsp) => {
  if (req === 'slow-down-01') {
    speedMod(0.1);
  } else if (req === 'slow-down-02') {
    speedMod(0.2);
  } else if (req === 'slow-down-04') {
    speedMod(0.4);
  } else if (req === 'slow-down-06') {
    speedMod(0.6);
  } else if (req === 'slow-down-08') {
    speedMod(0.8);
  } else if (req === 'speed-up-12') {
    speedMod(1.2);
  } else if (req === 'speed-up-14') {
    speedMod(1.4);
  } else if (req === 'speed-up-16') {
    speedMod(1.6);
  } else if (req === 'speed-up-18') {
    speedMod(1.8);
  } else if (req === 'speed-up-20') {
    speedMod(2.0);
  }

  rsp();
});
