// EXAMPLES {{{
/*
 * Reddit page with multiple videos: https://bit.ly/49NeN9v
 */
// }}}

// -> get/set keybinding functions {{{
function getKeyBindings(action, what = 'value') {
  try {
    return vsc.settings.keyBindings.find((item) => item.action === action)[what];
  } catch (e) {
    return false;
  }
}

function setKeyBindings(action, value) {
  vsc.settings.keyBindings.find((item) => item.action === action)['value'] = value;
}
// }}}

// -> refreshCoolDown {{{
var coolDown = false;
function refreshCoolDown() {
  log('Begin refreshCoolDown', DEBUG);
  if (coolDown) {
    clearTimeout(coolDown);
  }
  coolDown = setTimeout(function () {
    coolDown = false;
  }, 1000);
  log('End refreshCoolDown', DEBUG);
}
// }}}

// -> setupListener {{{
function setupListener() {
  log('Begin setupListener', DEBUG);
  /**
   * This function is run whenever a video speed rate change occurs.
   * It is used to update the speed that shows up in the display as well as save
   * that latest speed into the local storage.
   *
   * @param {*} video The video element to update the speed indicators for.
   */
  function updateSpeedFromEvent(video) {
    // It's possible to get a rate change on a VIDEO/AUDIO that doesn't have
    // a video controller attached to it.  If we do, ignore it.
    if (!video.vsc) return;
    var speedIndicator = video.vsc.speedIndicator;
    var src = video.currentSrc;
    var speed = Number(video.playbackRate.toFixed(2));

    log('Playback rate changed to ' + speed, INFO);

    log('Updating controller with new speed', DEBUG);
    speedIndicator.textContent = speed.toFixed(2);
    vsc.settings.speeds[getBaseURL(src)] = {
      speed,
      updated: new Date().valueOf(),
    };

    log('Storing lastSpeed in settings for the rememberSpeed feature', DEBUG);
    vsc.settings.lastSpeed = speed;
    log('Syncing chrome settings for lastSpeed', DEBUG);
    chrome.storage.sync.set(
      {
        lastSpeed: speed,
        speeds: vsc.settings.speeds,
      },
      function () {
        log('Speed (and SPEEDS) setting saved: ' + speed, DEBUG);
      },
    );
    // show the controller for 1000ms if it's hidden.
    runAction({ action: 'blink' });
  }

  document.addEventListener(
    'ratechange',
    function (event) {
      if (coolDown) {
        log('Speed event propagation blocked', INFO);
        event.stopImmediatePropagation();
      }
      var video = event.target;

      /**
       * If the last speed is forced, only update the speed based on events created by
       * video speed instead of all video speed change events.
       */
      if (vsc.settings.forceLastSavedSpeed) {
        log('Force last-saved speed is ON', DEBUG);
        if (event.detail && event.detail.origin === 'videoSpeed') {
          log(`Setting playbackRate to event.detail's speed (${event.detail.speed})`, DEBUG);
          video.playbackRate = event.detail.speed;
          updateSpeedFromEvent(video);
        } else {
          log(`Setting playbackRate to vsc.settings.lastSpeed (${vsc.settings.lastSpeed})`, DEBUG);
          video.playbackRate = vsc.settings.lastSpeed;
        }
        event.stopImmediatePropagation();
      } else {
        log("Force last-saved speed is OFF; calling 'updateSpeedFromEvent'", DEBUG);
        updateSpeedFromEvent(video);
      }
    },
    true,
  );
  log('End setupListener', DEBUG);
}
// }}}

// -> inIframe {{{
function inIframe() {
  try {
    return window.self !== window.top;
  } catch (e) {
    return true;
  }
}
// }}}

// -> getShadow {{{
function getShadow(parent) {
  let result = [];
  function getChild(parent) {
    if (parent.firstElementChild) {
      var child = parent.firstElementChild;
      do {
        result.push(child);
        getChild(child);
        if (child.shadowRoot) {
          result.push(getShadow(child.shadowRoot));
        }
        child = child.nextElementSibling;
      } while (child);
    }
  }
  getChild(parent);
  return result.flat(Infinity);
}
// }}}

// -> checkForVideo {{{
function checkForVideo(node, parent, added) {
  // This function is called QUITE a few times, so logs are SUPER noisy!
  // log('Begin checkForVideo', DEBUG);

  // Only proceed with supposed removal if node is missing from DOM
  if (!added && document.body?.contains(node)) {
    return;
  }

  if (node.nodeName === 'VIDEO' || (node.nodeName === 'AUDIO' && vsc.settings.audioBoolean)) {
    if (added) {
      log('added', DEBUG);
      node.vsc = new vsc.videoController(node, parent);
    } else {
      log('not added', DEBUG);
      if (node.vsc) {
        node.vsc.remove();
      }
    }
  } else if (node.children != undefined) {
    log(
      `node has ${node.children.length} children; checkForVideo on each`,
      TRACE,
      node.nodeName,
      node,
    );

    for (var i = 0; i < node.children.length; i++) {
      const child = node.children[i];
      checkForVideo(child, child.parentNode || parent, added);
    }
  }
  // log('End checkForVideo', DEBUG);
}
// }}}

// -> setSpeed {{{
function setSpeed(video, speed) {
  log('setSpeed started: ' + speed, DEBUG, video);

  const src = video.currentSrc;
  const speedvalue = speed.toFixed(2);

  // Not sure when we want dispatch and when playbackRate; added playbackRate
  // in dispatch because dispatch had no effect in reddit (for example).
  if (vsc.settings.forceLastSavedSpeed) {
    video.dispatchEvent(
      new CustomEvent('ratechange', {
        detail: { origin: 'videoSpeed', speed: speedvalue },
      }),
    );
    // Seems like doing playbackRate directly sometimes gives error:
    // 'Uncaught (in promise) Error: Not implemented', but it seems to be working?? :/
    // And no, adding a try/catch here doens't remove the error in the console!
    video.playbackRate = Number(speedvalue);
  } else {
    video.playbackRate = Number(speedvalue);
  }

  var speedIndicator = video.vsc.speedIndicator;
  speedIndicator.textContent = speedvalue;
  vsc.settings.lastSpeed = speed;
  vsc.settings.speeds[getBaseURL(src)] = {
    speed,
    updated: new Date().valueOf(),
  };
  chrome.storage.sync.set(
    {
      lastSpeed: speed,
      speeds: vsc.settings.speeds,
    },
    () => log('Speed (and SPEEDS) setting saved: ' + speed, DEBUG),
  );
  refreshCoolDown();
  log('setSpeed finished: ' + speed, DEBUG);
}
// }}}

// -> runAction {{{
function runAction({ action, value, value2, e }) {
  const mediaTags = vsc.mediaElements;

  // Get the controller that was used if called from a button press event e
  if (e) {
    var targetController = e.target.getRootNode().host;
  }

  mediaTags.forEach(function (v) {
    if (!v) return;

    var controller = v.vsc.div;

    // Don't change video speed if the video has a different controller
    if (e && !(targetController == controller)) {
      log('runAction e, targetController, controller', DEBUG, e, targetController, controller);
      return;
    }

    const percent = (value * v.duration) / 100;
    const step = Math.min(value2 || 5, percent); // Only used for rewind and advance

    showController(controller);

    if (!v.classList.contains('vsc-cancelled')) {
      if (action.startsWith('fixspeed')) {
        const speedValue = Number(action.split('-')[1]);
        setSpeed(v, speedValue);
      } else if (action === 'rewind') {
        log('Rewind', DEBUG);
        v.currentTime -= step;
      } else if (action === 'advance') {
        log('Fast forward', DEBUG);
        v.currentTime += step;
      } else if (action === 'faster') {
        log('Increase speed', DEBUG);
        // Maximum playback speed in Chrome is set to 16:
        // https://cs.chromium.org/chromium/src/third_party/blink/renderer/core/html/media/html_media_element.cc?gsn=kMinRate&l=166
        var s = Math.min((v.playbackRate < 0.1 ? 0.0 : v.playbackRate) + value, 16);
        setSpeed(v, s);
      } else if (action === 'slower') {
        log('Decrease speed', DEBUG);
        // Video min rate is 0.0625:
        // https://cs.chromium.org/chromium/src/third_party/blink/renderer/core/html/media/html_media_element.cc?gsn=kMinRate&l=165
        var s = Math.max(v.playbackRate - value, 0.07);
        setSpeed(v, s);
      } else if (action === 'reset') {
        log('Reset speed', DEBUG);
        resetSpeed(v, 1.0);
      } else if (action === 'go-start') {
        log('Go to video start', DEBUG);
        v.currentTime = 0;
      } else if (action === 'display') {
        log('Showing controller', DEBUG);
        controller.classList.add('vsc-manual');
        controller.classList.toggle('vsc-hidden');
      } else if (action === 'blink') {
        log('Showing controller momentarily', DEBUG);
        // if vsc is hidden, show it briefly to give the use visual feedback that the action is excuted.
        if (controller.classList.contains('vsc-hidden') || controller.blinkTimeOut !== undefined) {
          clearTimeout(controller.blinkTimeOut);
          controller.classList.remove('vsc-hidden');
          controller.blinkTimeOut = setTimeout(
            () => {
              controller.classList.add('vsc-hidden');
              controller.blinkTimeOut = undefined;
            },
            value ? value : 1000,
          );
        }
      } else if (action === 'drag') {
        handleDrag(v, e);
      } else if (action === 'fast') {
        resetSpeed(v, value);
      } else if (action === 'pause') {
        pause(v);
      } else if (action === 'muted') {
        muted(v);
      } else if (action === 'mark') {
        setMark(v);
      } else if (action === 'jump') {
        jumpToMark(v);
      }
    }
  });
  log('runAction End', DEBUG);
}
// }}}

// -> pause {{{
function pause(v) {
  if (v.paused) {
    log('Resuming video', DEBUG);
    v.play();
  } else {
    log('Pausing video', DEBUG);
    v.pause();
  }
}
// }}}

// -> resetSpeed {{{
function resetSpeed(v, target) {
  if (v.playbackRate === target) {
    if (v.playbackRate === getKeyBindings('reset')) {
      if (target !== 1.0) {
        log('Resetting playback speed to 1.0', INFO);
        setSpeed(v, 1.0);
      } else {
        log('Toggling playback speed to "fast" speed', INFO);
        setSpeed(v, getKeyBindings('fast'));
      }
    } else {
      log('Toggling playback speed to "reset" speed', INFO);
      setSpeed(v, getKeyBindings('reset'));
    }
  } else {
    log('Toggling playback speed to "reset" speed', INFO);
    setKeyBindings('reset', v.playbackRate);
    setSpeed(v, target);
  }
}
// }}}

// -> muted {{{
function muted(v) {
  v.muted = v.muted !== true;
}
// }}}

// -> setMark {{{
function setMark(v) {
  log('Adding marker', DEBUG);
  v.vsc.mark = v.currentTime;
}
// }}}

// -> jumpToMark {{{
function jumpToMark(v) {
  log('Recalling marker', DEBUG);
  if (v.vsc.mark && typeof v.vsc.mark === 'number') {
    v.currentTime = v.vsc.mark;
  }
}
// }}}

// -> handleDrag {{{
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
// }}}

// -> showController {{{
var timer = null;
function showController(controller) {
  log('Showing controller', INFO);
  controller.classList.add('vcs-show');

  if (timer) clearTimeout(timer);

  timer = setTimeout(function () {
    controller.classList.remove('vcs-show');
    timer = false;
    log('Hiding controller', DEBUG);
  }, 2000);
}
// }}}

// vim: foldmethod=marker
