function pause(v) {
  if (v.paused) {
    log('Resuming video', DEBUG);
    v.play();
  } else {
    log('Pausing video', DEBUG);
    v.pause();
  }
}

function resetSpeed(v, target) {
  if (v.playbackRate === target) {
    if (v.playbackRate === getKeyBindings('reset')) {
      if (target !== 1.0) {
        log('Resetting playback speed to 1.0', DEBUG);
        setSpeed(v, 1.0);
      } else {
        log('Toggling playback speed to "fast" speed', DEBUG);
        setSpeed(v, getKeyBindings('fast'));
      }
    } else {
      log('Toggling playback speed to "reset" speed', DEBUG);
      setSpeed(v, getKeyBindings('reset'));
    }
  } else {
    log('Toggling playback speed to "reset" speed', DEBUG);
    setKeyBindings('reset', v.playbackRate);
    setSpeed(v, target);
  }
}

function muted(v) {
  v.muted = v.muted !== true;
}

function setMark(v) {
  log('Adding marker', DEBUG);
  v.vsc.mark = v.currentTime;
}

function jumpToMark(v) {
  log('Recalling marker', DEBUG);
  if (v.vsc.mark && typeof v.vsc.mark === 'number') {
    v.currentTime = v.vsc.mark;
  }
}

let timer = null;
function showController(controller) {
  log('Showing controller', DEBUG);
  controller.classList.add('vcs-show');

  if (timer) clearTimeout(timer);

  timer = setTimeout(function () {
    controller.classList.remove('vcs-show');
    timer = false;
    log('Hiding controller', DEBUG);
  }, 2000);
}

function setSpeed(video, speed) {
  // As mentioned in ratechange handler:
  // Disabling cooldown since, eg., the speed is not updated on the video! :/
  // if (vsc.coolDown) return;

  log('setSpeed started: ' + speed, DEBUG);

  const src = video?.currentSrc;
  if (!src) return;

  if (speed === undefined) {
    const url = getBaseURL(src);

    if (vsc.settings.forceLastSavedSpeed) {
      speed = vsc.settings.speeds[url]?.speed;
    }
  }

  const speedvalue = Number(speed || 1.0).toFixed(1);

  // Seems like doing playbackRate directly sometimes gives error:
  // 'Uncaught (in promise) Error: Not implemented', but it seems to be working?? :/
  // And no, adding a try/catch here doens't remove the error in the console!
  video.playbackRate = Number(speedvalue);

  // Not sure when we want dispatch and when playbackRate; added playbackRate
  // in dispatch because dispatch had no effect in reddit (for example).
  if (vsc.settings.forceLastSavedSpeed) {
    // Any reason to dispatch this here??!!
    // video.dispatchEvent(
    //   new CustomEvent('ratechange', {
    //     // bubbles and composed are needed to allow event to 'escape' open shadow DOMs
    //     bubbles: true,
    //     composed: true,
    //     detail: { origin: 'videoSpeed', speed: speedvalue },
    //   }),
    // );
    video.dispatchEvent(
      new CustomEvent('vscsetspeed', {
        // bubbles and composed are needed to allow event to 'escape' open shadow DOMs
        bubbles: true,
        composed: true,
        detail: { origin: 'videoSpeed', speed: speedvalue },
      }),
    );
  }

  video.vsc?.setSpeedVal(speedvalue);

  vsc.settings.lastSpeed = speed;

  const url = getBaseURL(src);
  syncSpeedValue({ speed, url });

  log('starting cooldown', DEBUG);
  startCoolDown();

  log('setSpeed finished: ' + speed, DEBUG);
}

function handleDrag(video, e) {
  const controller = video.vsc.div;
  const shadowController = controller.shadowRoot.querySelector('#controller');

  // Find nearest parent of same size as video parent.
  var parentElement = controller.parentElement;
  while (
    parentElement.parentNode &&
    parentElement.parentNode.offsetHeight === parentElement.offsetHeight &&
    parentElement.parentNode.offsetWidth === parentElement.offsetWidth
  ) {
    parentElement = parentElement.parentNode;
  }

  video.classList.add('vcs-dragging');
  shadowController.classList.add('dragging');

  const initialMouseXY = [e.clientX, e.clientY];
  const initialControllerXY = [
    parseInt(shadowController.style.left),
    parseInt(shadowController.style.top),
  ];

  const startDragging = (e) => {
    let style = shadowController.style;
    let dx = e.clientX - initialMouseXY[0];
    let dy = e.clientY - initialMouseXY[1];
    style.left = initialControllerXY[0] + dx + 'px';
    style.top = initialControllerXY[1] + dy + 'px';
  };

  const stopDragging = () => {
    parentElement.removeEventListener('mousemove', startDragging);
    parentElement.removeEventListener('mouseup', stopDragging);
    parentElement.removeEventListener('mouseleave', stopDragging);

    shadowController.classList.remove('dragging');
    video.classList.remove('vcs-dragging');
  };

  parentElement.addEventListener('mouseup', stopDragging);
  parentElement.addEventListener('mouseleave', stopDragging);
  parentElement.addEventListener('mousemove', startDragging);
}

// vim: foldmethod=marker
