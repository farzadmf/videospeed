var regStrip = /^[\r\t\f\v ]+|[\r\t\f\v ]+$/gm;
var regEndsWithFlags = /\/(?!.*(.).*\1)[gimsuy]*$/;

// EXAMPLES {{{
/*
 * Reddit page with multiple videos: https://bit.ly/49NeN9v
 */
// }}}

// -> vsc object {{{
var vsc = {
  settings: {
    lastSpeed: 1.0, // default 1x
    enabled: true, // default enabled
    speeds: {}, // empty object to hold speed for each source
    speedBySite: true,

    displayKeyCode: 86, // default: V
    rememberSpeed: false, // default: false
    forceLastSavedSpeed: false, //default: false
    audioBoolean: false, // default: false
    startHidden: false, // default: false
    controllerOpacity: 0.6, // default: 0.6
    keyBindings: [],
    blacklist: `\
      www.instagram.com
      twitter.com
      vine.co
      imgur.com
      teams.microsoft.com
    `.replace(regStrip, ''),
    defaultLogLevel: INFO, // default: INFO
    logLevel: WARNING, // default: WARNING
  },

  // To keep track of the documents we're adding event listeners to.
  // Maps each doc to its kwydown event listener.
  docs: new Map(),

  // Holds a reference to all of the AUDIO/VIDEO DOM elements we've attached to
  mediaElements: [],

  observed: new Set(),
};
// }}}

// -> vsc object constructor and methods {{{
// --> vsc.videoController = ... {{{
vsc.videoController = function (target, parent) {
  if (target.vsc) {
    return target.vsc;
  }

  vsc.mediaElements.push(target);

  this.video = target;
  this.parent = target.parentElement || parent;
  storedSpeed = vsc.settings.speeds[getBaseURL(target.currentSrc)]?.speed || 1.0;

  if (!vsc.settings.rememberSpeed) {
    if (!storedSpeed) {
      log('Overwriting stored speed to 1.0 due to rememberSpeed being disabled', DEBUG);
      storedSpeed = 1.0;
    }
    setKeyBindings('reset', getKeyBindings('fast')); // resetSpeed = fastSpeed
  } else {
    log('Recalling stored speed ' + storedSpeed + ' due to rememberSpeed being enabled', DEBUG);
    //storedSpeed = vsc.settings.lastSpeed;
  }

  log('Explicitly setting playbackRate to: ' + storedSpeed, DEBUG);
  target.playbackRate = storedSpeed;

  this.div = this.initializeControls();

  var mediaEventAction = function (event) {
    storedSpeed = vsc.settings.speeds[getBaseURL(event.target.currentSrc)]?.speed || 1.0;

    if (!vsc.settings.rememberSpeed) {
      if (!storedSpeed) {
        log('Overwriting stored speed to 1.0 (rememberSpeed not enabled)', INFO);
        storedSpeed = 1.0;
      }
      // resetSpeed isn't really a reset, it's a toggle
      log('Setting reset keybinding to fast', DEBUG);
      setKeyBindings('reset', getKeyBindings('fast')); // resetSpeed = fastSpeed
    } else {
      // log(
      //   "Storing lastSpeed into vsc.settings.speeds (rememberSpeed enabled)",
      //   5
      // );
      //storedSpeed = vsc.settings.lastSpeed;
    }
    // TODO: Check if explicitly setting the playback rate to 1.0 is
    // necessary when rememberSpeed is disabled (this may accidentally
    // override a website's intentional initial speed setting interfering
    // with the site's default behavior)
    log('Explicitly setting playbackRate to: ' + storedSpeed, INFO);
    setSpeed(event.target, storedSpeed);
  };

  target.addEventListener('play', (this.handlePlay = mediaEventAction.bind(this)));

  target.addEventListener('seeked', (this.handleSeek = mediaEventAction.bind(this)));

  var observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (
        mutation.type === 'attributes' &&
        (mutation.attributeName === 'src' || mutation.attributeName === 'currentSrc')
      ) {
        log('mutation of A/V element', DEBUG);
        document.body.classList.remove('vsc-initialized');
        vsc.mediaElements = [];
        vsc.docs.forEach((listener, doc) => {
          doc.removeEventListener('keydown', listener, true);
        });
        vsc.docs = new Map();
        initializeWhenReady(document);
        // var controller = this.div;
        // if (!mutation.target.src && !mutation.target.currentSrc) {
        //   controller.classList.add('vsc-nosource');
        // } else {
        //   controller.classList.remove('vsc-nosource');
        // }
      }
    });
  });
  observer.observe(target, {
    attributeFilter: ['src', 'currentSrc'],
  });
};
// }}}

// --> vsc.videoController.prototype.remove = ... {{{
vsc.videoController.prototype.remove = function () {
  this.div.remove();
  this.video.removeEventListener('play', this.handlePlay);
  this.video.removeEventListener('seek', this.handleSeek);
  delete this.video.vsc;
  let idx = vsc.mediaElements.indexOf(this.video);
  if (idx != -1) {
    vsc.mediaElements.splice(idx, 1);
  }
};
// }}}

// --> vsc.videoController.prototype.initializeControls = ... {{{
vsc.videoController.prototype.initializeControls = function () {
  log('initializeControls Begin', DEBUG);
  const document = this.video.ownerDocument;
  const speed = this.video.playbackRate.toFixed(2);
  const rect = this.video.getBoundingClientRect();
  // getBoundingClientRect is relative to the viewport; style coordinates
  // are relative to offsetParent, so we adjust for that here. offsetParent
  // can be null if the video has `display: none` or is not yet in the DOM.
  const offsetRect = this.video.offsetParent?.getBoundingClientRect();
  const top = Math.max(rect.top - (offsetRect?.top || 0), 30) + 'px';
  const left = Math.max(rect.left - (offsetRect?.left || 0), 0) + 'px';

  log('Speed variable set to: ' + speed, DEBUG);

  var wrapper = document.createElement('div');
  wrapper.classList.add('vsc-controller');

  if (!this.video.currentSrc) {
    wrapper.classList.add('vsc-nosource');
  }

  if (vsc.settings.startHidden) {
    wrapper.classList.add('vsc-hidden');
  }

  var shadow = wrapper.attachShadow({ mode: 'open' });
  var shadowTemplate = `
      <style>
        @import "${chrome.runtime.getURL('shadow.css')}";
      </style>

      <div id="controller" style="top:${top}; left:${left}; opacity:${
        vsc.settings.controllerOpacity
      }">
        <span data-action="drag" class="draggable">${speed}</span>
        <span id="controls">
          <button data-action="rewind" class="rw">«</button>
          <button data-action="slower">&minus;</button>
          <button data-action="faster">&plus;</button>
          <button data-action="advance" class="rw">»</button>
          <button data-action="display" class="hideButton">&times;</button>
        </span>
      </div>
    `;
  shadow.innerHTML = shadowTemplate;
  shadow.querySelector('.draggable').addEventListener(
    'mousedown',
    (e) => {
      runAction({
        action: e.target.dataset['action'],
        value: false,
        e,
      });
      e.stopPropagation();
    },
    true,
  );

  shadow.querySelectorAll('button').forEach(function (button) {
    button.addEventListener(
      'click',
      (e) => {
        runAction({
          action: e.target.dataset['action'],
          value: getKeyBindings(e.target.dataset['action']),
          e,
        });
        e.stopPropagation();
      },
      true,
    );
  });

  shadow.querySelector('#controller').addEventListener('click', (e) => e.stopPropagation(), false);
  shadow
    .querySelector('#controller')
    .addEventListener('mousedown', (e) => e.stopPropagation(), false);

  this.speedIndicator = shadow.querySelector('span');
  var fragment = document.createDocumentFragment();
  fragment.appendChild(wrapper);

  switch (true) {
    case location.hostname == 'www.amazon.com':
    case location.hostname == 'www.reddit.com':
    case /hbogo\./.test(location.hostname):
      // insert before parent to bypass overlay
      this.parent.parentElement.insertBefore(fragment, this.parent);
      break;
    case location.hostname == 'www.facebook.com':
      // this is a monstrosity but new FB design does not have *any*
      // semantic handles for us to traverse the tree, and deep nesting
      // that we need to bubble up from to get controller to stack correctly
      let p =
        this.parent.parentElement.parentElement.parentElement.parentElement.parentElement
          .parentElement.parentElement;
      p.insertBefore(fragment, p.firstChild);
      break;
    case location.hostname == 'tv.apple.com':
      // insert before parent to bypass overlay
      this.parent.parentNode.insertBefore(fragment, this.parent.parentNode.firstChild);
      break;
    default:
      // Note: when triggered via a MutationRecord, it's possible that the
      // target is not the immediate parent. This appends the controller as
      // the first element of the target, which may not be the parent.
      // this.parent.insertBefore(fragment, this.parent.firstChild);
      this.parent.insertBefore(fragment, this.parent.firstChild);
  }
  return wrapper;
};
// }}}
// }}}

// -> init from local storage {{{
chrome.storage.sync.get(vsc.settings, function (storage) {
  vsc.settings.keyBindings = storage.keyBindings; // Array

  // --> update keybindings from storage and sync back {{{
  //
  if (storage.keyBindings.length == 0) {
    // if first initialization of 0.5.3
    // UPDATE
    vsc.settings.keyBindings.push({
      action: 'slower',
      key: Number(storage.slowerKeyCode) || 222,
      value: Number(storage.speedStep) || 0.1,
      force: false,
      predefined: true,
    }); // default S
    vsc.settings.keyBindings.push({
      action: 'faster',
      key: Number(storage.fasterKeyCode) || 186,
      value: Number(storage.speedStep) || 0.1,
      force: false,
      predefined: true,
    }); // default: D
    vsc.settings.keyBindings.push({
      action: 'rewind',
      key: Number(storage.rewindKeyCode) || 90,
      value: Number(storage.rewindTime) || 10,
      force: false,
      predefined: true,
    }); // default: Z
    vsc.settings.keyBindings.push({
      action: 'advance',
      key: Number(storage.advanceKeyCode) || 88,
      value: Number(storage.advanceTime) || 10,
      force: false,
      predefined: true,
    }); // default: X
    vsc.settings.keyBindings.push({
      action: 'reset',
      key: Number(storage.resetKeyCode) || 82,
      value: 1.0,
      force: false,
      predefined: true,
    }); // default: R
    vsc.settings.keyBindings.push({
      action: 'fast',
      key: Number(storage.fastKeyCode) || 71,
      value: Number(storage.fastSpeed) || 3,
      force: false,
      predefined: true,
    }); // default: G
    vsc.settings.keyBindings.push({
      action: 'pause',
      key: 190,
      value: 1,
      force: false,
      predefined: false,
    }); // default: .
    for (let i = 1; i <= 9; i++) {
      vsc.settings.keyBindings.push({
        action: `fixspeed-${i}`,
        key: 48 + i, // 48 is zero
        shift: false,
        ctrl: false,
        value: i,
        force: true,
        predefined: false,
      });
      vsc.settings.keyBindings.push({
        action: `fixspeed-${i}.5`,
        key: 48 + i, // 48 is zero
        shift: true,
        ctrl: false,
        value: i + 0.5,
        force: true,
        predefined: false,
      });
    }
    vsc.settings.version = '0.5.3';

    chrome.storage.sync.set({
      audioBoolean: vsc.settings.audioBoolean,
      blacklist: vsc.settings.blacklist.replace(regStrip, ''),
      controllerOpacity: vsc.settings.controllerOpacity,
      defaultLogLevel: vsc.settings.defaultLogLevel,
      displayKeyCode: vsc.settings.displayKeyCode,
      enabled: vsc.settings.enabled,
      forceLastSavedSpeed: vsc.settings.forceLastSavedSpeed,
      keyBindings: vsc.settings.keyBindings,
      rememberSpeed: vsc.settings.rememberSpeed,
      startHidden: vsc.settings.startHidden,
      version: vsc.settings.version,
    });
  }
  // }}}

  // --> update other settings from storage {{{
  vsc.settings.audioBoolean = Boolean(storage.audioBoolean);
  vsc.settings.blacklist = String(storage.blacklist);
  vsc.settings.controllerOpacity = Number(storage.controllerOpacity);
  vsc.settings.displayKeyCode = Number(storage.displayKeyCode);
  vsc.settings.enabled = Boolean(storage.enabled);
  vsc.settings.forceLastSavedSpeed = Boolean(storage.forceLastSavedSpeed);
  vsc.settings.lastSpeed = Number(storage.lastSpeed);
  vsc.settings.logLevel = Number(storage.logLevel);
  vsc.settings.rememberSpeed = Boolean(storage.rememberSpeed);
  vsc.settings.speeds = storage.speeds;
  vsc.settings.startHidden = Boolean(storage.startHidden);
  // }}}

  // ensure that there is a "display" binding (for upgrades from versions that had it as a separate binding)
  if (vsc.settings.keyBindings.filter((x) => x.action == 'display').length == 0) {
    vsc.settings.keyBindings.push({
      action: 'display',
      key: Number(storage.displayKeyCode) || 86,
      value: 0,
      force: false,
      predefined: true,
    }); // default V
  }

  initializeWhenReady(document);
});
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

// -> functions to get/check [blacklist] URLs {{{
function escapeStringRegExp(str) {
  matchOperatorsRe = /[|\\{}()[\]^$+*?.]/g;
  return str.replace(matchOperatorsRe, '\\$&');
}

function isBlacklisted() {
  var blacklisted = false;
  vsc.settings.blacklist.split('\n').forEach((match) => {
    if (isLocationMatch(match)) {
      blacklisted = true;
      return;
    }
    // match = match.replace(regStrip, "");
    // if (match.length == 0) {
    //   return;
    // }

    // if (match.startsWith("/")) {
    //   try {
    //     var parts = match.split("/");

    //     if (regEndsWithFlags.test(match)) {
    //       var flags = parts.pop();
    //       var regex = parts.slice(1).join("/");
    //     } else {
    //       var flags = "";
    //       var regex = match;
    //     }

    //     var regexp = new RegExp(regex, flags);
    //   } catch (err) {
    //     return;
    //   }
    // } else {
    //   var regexp = new RegExp(escapeStringRegExp(match));
    // }

    // if (regexp.test(location.href)) {
    //   blacklisted = true;
    //   return;
    // }
  });
  return blacklisted;
}

function getBaseURL(fullURL) {
  urlReg = new RegExp(new RegExp(/(https?:\/\/.*?\/).*/));
  match = fullURL.match(urlReg);

  if (!!match) {
    return match[match.length - 1];
  }

  return null;
}

function isLocationMatch(match) {
  match = match.replace(regStrip, '');
  if (match.length == 0) {
    return false;
  }

  if (match.startsWith('/')) {
    try {
      var parts = match.split('/');

      if (regEndsWithFlags.test(match)) {
        var flags = parts.pop();
        var regex = parts.slice(1).join('/');
      } else {
        var flags = '';
        var regex = match;
      }

      var regexp = new RegExp(regex, flags);
    } catch (err) {
      return false;
    }
  } else {
    var regexp = new RegExp(escapeStringRegExp(match));
  }

  return regexp.test(location.href);
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
