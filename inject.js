var regStrip = /^[\r\t\f\v ]+|[\r\t\f\v ]+$/gm;
var regEndsWithFlags = /\/(?!.*(.).*\1)[gimsuy]*$/;

// EXAMPLES {{{
/*
 * Reddit page with multiple videos: https://bit.ly/49NeN9v
 */
// }}}

// -> log levels {{{
/* Log levels (depends on caller specifying the correct level)
  1 - none
  2 - error
  3 - warning
  4 - info
  5 - debug
  6 - debug high verbosity + stack trace on each message
*/
const NONE = 1;
const ERROR = 2;
const WARNING = 3;
const INFO = 4;
const DEBUG = 5;
const TRACE = 6;
// }}}

// -> log function {{{
function log(message, level, ...args) {
  const verbosity = tc.settings.logLevel;
  if (typeof level === 'undefined') {
    level = tc.settings.defaultLogLevel;
  }

  if (verbosity >= level) {
    if (level === ERROR) {
      console.log(`[FMVSC ERROR]: ${message}`, ...args);
    } else if (level === WARNING) {
      console.log(`[FMVSC WARNING]: ${message}`, ...args);
    } else if (level === INFO) {
      console.log(`[FMVSC INFO]: ${message}`, ...args);
    } else if (level === DEBUG) {
      console.log(`[FMVSC DEBUG]: ${message}`, ...args);
    } else if (level === TRACE) {
      console.log(`[FMVSC DEBUG (VERBOSE)]: ${message}`, ...args);
      console.trace();
    }
  }
}

function logGroup(groupName, level) {
  const verbosity = tc.settings.logLevel;
  if (typeof level === 'undefined') {
    level = tc.settings.defaultLogLevel;
  }

  if (verbosity >= level) {
    console.group(groupName);
  }
}

function logGroupEnd(level) {
  const verbosity = tc.settings.logLevel;
  if (typeof level === 'undefined') {
    level = tc.settings.defaultLogLevel;
  }

  if (verbosity >= level) {
    console.groupEnd();
  }
}
// }}}

// -> tc object {{{
var tc = {
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

  // Holds a reference to all of the AUDIO/VIDEO DOM elements we've attached to
  mediaElements: [],

  observed: new Set(),
};
// }}}

// -> tc object constructor and methods {{{
// --> tc.videoController = ... {{{
tc.videoController = function (target, parent) {
  log('HERE', DEBUG, target);
  if (target.vsc) {
    return target.vsc;
  }

  tc.mediaElements.push(target);

  this.video = target;
  this.parent = target.parentElement || parent;
  storedSpeed = tc.settings.speeds[getBaseURL(target.currentSrc)]?.speed || 1.0;

  if (!tc.settings.rememberSpeed) {
    if (!storedSpeed) {
      log('Overwriting stored speed to 1.0 due to rememberSpeed being disabled', DEBUG);
      storedSpeed = 1.0;
    }
    setKeyBindings('reset', getKeyBindings('fast')); // resetSpeed = fastSpeed
  } else {
    log('Recalling stored speed ' + storedSpeed + ' due to rememberSpeed being enabled', DEBUG);
    //storedSpeed = tc.settings.lastSpeed;
  }

  log('Explicitly setting playbackRate to: ' + storedSpeed, DEBUG);
  target.playbackRate = storedSpeed;

  this.div = this.initializeControls();

  var mediaEventAction = function (event) {
    storedSpeed = tc.settings.speeds[getBaseURL(event.target.currentSrc)]?.speed || 1.0;

    if (!tc.settings.rememberSpeed) {
      if (!storedSpeed) {
        log('Overwriting stored speed to 1.0 (rememberSpeed not enabled)', INFO);
        storedSpeed = 1.0;
      }
      // resetSpeed isn't really a reset, it's a toggle
      log('Setting reset keybinding to fast', DEBUG);
      setKeyBindings('reset', getKeyBindings('fast')); // resetSpeed = fastSpeed
    } else {
      // log(
      //   "Storing lastSpeed into tc.settings.speeds (rememberSpeed enabled)",
      //   5
      // );
      //storedSpeed = tc.settings.lastSpeed;
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
        var controller = this.div;
        if (!mutation.target.src && !mutation.target.currentSrc) {
          controller.classList.add('vsc-nosource');
        } else {
          controller.classList.remove('vsc-nosource');
        }
      }
    });
  });
  observer.observe(target, {
    attributeFilter: ['src', 'currentSrc'],
  });
};
// }}}

// --> tc.videoController.prototype.remove = ... {{{
tc.videoController.prototype.remove = function () {
  this.div.remove();
  this.video.removeEventListener('play', this.handlePlay);
  this.video.removeEventListener('seek', this.handleSeek);
  delete this.video.vsc;
  let idx = tc.mediaElements.indexOf(this.video);
  if (idx != -1) {
    tc.mediaElements.splice(idx, 1);
  }
};
// }}}

// --> tc.videoController.prototype.initializeControls = ... {{{
tc.videoController.prototype.initializeControls = function () {
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

  if (tc.settings.startHidden) {
    wrapper.classList.add('vsc-hidden');
  }

  var shadow = wrapper.attachShadow({ mode: 'open' });
  var shadowTemplate = `
      <style>
        @import "${chrome.runtime.getURL('shadow.css')}";
      </style>

      <div id="controller" style="top:${top}; left:${left}; opacity:${
        tc.settings.controllerOpacity
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
chrome.storage.sync.get(tc.settings, function (storage) {
  tc.settings.keyBindings = storage.keyBindings; // Array

  // --> update keybindings from storage and sync back {{{
  //
  if (storage.keyBindings.length == 0) {
    // if first initialization of 0.5.3
    // UPDATE
    tc.settings.keyBindings.push({
      action: 'slower',
      key: Number(storage.slowerKeyCode) || 222,
      value: Number(storage.speedStep) || 0.1,
      force: false,
      predefined: true,
    }); // default S
    tc.settings.keyBindings.push({
      action: 'faster',
      key: Number(storage.fasterKeyCode) || 186,
      value: Number(storage.speedStep) || 0.1,
      force: false,
      predefined: true,
    }); // default: D
    tc.settings.keyBindings.push({
      action: 'rewind',
      key: Number(storage.rewindKeyCode) || 90,
      value: Number(storage.rewindTime) || 10,
      force: false,
      predefined: true,
    }); // default: Z
    tc.settings.keyBindings.push({
      action: 'advance',
      key: Number(storage.advanceKeyCode) || 88,
      value: Number(storage.advanceTime) || 10,
      force: false,
      predefined: true,
    }); // default: X
    tc.settings.keyBindings.push({
      action: 'reset',
      key: Number(storage.resetKeyCode) || 82,
      value: 1.0,
      force: false,
      predefined: true,
    }); // default: R
    tc.settings.keyBindings.push({
      action: 'fast',
      key: Number(storage.fastKeyCode) || 71,
      value: Number(storage.fastSpeed) || 3,
      force: false,
      predefined: true,
    }); // default: G
    tc.settings.keyBindings.push({
      action: 'pause',
      key: 190,
      value: 1,
      force: false,
      predefined: false,
    }); // default: .
    for (let i = 1; i <= 9; i++) {
      tc.settings.keyBindings.push({
        action: `fixspeed-${i}`,
        key: 48 + i, // 48 is zero
        shift: false,
        ctrl: false,
        value: i,
        force: true,
        predefined: false,
      });
      tc.settings.keyBindings.push({
        action: `fixspeed-${i}.5`,
        key: 48 + i, // 48 is zero
        shift: true,
        ctrl: false,
        value: i + 0.5,
        force: true,
        predefined: false,
      });
    }
    tc.settings.version = '0.5.3';

    chrome.storage.sync.set({
      audioBoolean: tc.settings.audioBoolean,
      blacklist: tc.settings.blacklist.replace(regStrip, ''),
      controllerOpacity: tc.settings.controllerOpacity,
      defaultLogLevel: tc.settings.defaultLogLevel,
      displayKeyCode: tc.settings.displayKeyCode,
      enabled: tc.settings.enabled,
      forceLastSavedSpeed: tc.settings.forceLastSavedSpeed,
      keyBindings: tc.settings.keyBindings,
      rememberSpeed: tc.settings.rememberSpeed,
      startHidden: tc.settings.startHidden,
      version: tc.settings.version,
    });
  }
  // }}}

  // --> update other settings from storage {{{
  tc.settings.audioBoolean = Boolean(storage.audioBoolean);
  tc.settings.blacklist = String(storage.blacklist);
  tc.settings.controllerOpacity = Number(storage.controllerOpacity);
  tc.settings.displayKeyCode = Number(storage.displayKeyCode);
  tc.settings.enabled = Boolean(storage.enabled);
  tc.settings.forceLastSavedSpeed = Boolean(storage.forceLastSavedSpeed);
  tc.settings.lastSpeed = Number(storage.lastSpeed);
  tc.settings.logLevel = Number(storage.logLevel);
  tc.settings.rememberSpeed = Boolean(storage.rememberSpeed);
  tc.settings.speeds = storage.speeds;
  tc.settings.startHidden = Boolean(storage.startHidden);
  // }}}

  // ensure that there is a "display" binding (for upgrades from versions that had it as a separate binding)
  if (tc.settings.keyBindings.filter((x) => x.action == 'display').length == 0) {
    tc.settings.keyBindings.push({
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
    return tc.settings.keyBindings.find((item) => item.action === action)[what];
  } catch (e) {
    return false;
  }
}

function setKeyBindings(action, value) {
  tc.settings.keyBindings.find((item) => item.action === action)['value'] = value;
}
// }}}

// -> functions to get/check [blacklist] URLs {{{
function escapeStringRegExp(str) {
  matchOperatorsRe = /[|\\{}()[\]^$+*?.]/g;
  return str.replace(matchOperatorsRe, '\\$&');
}

function isBlacklisted() {
  var blacklisted = false;
  tc.settings.blacklist.split('\n').forEach((match) => {
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
    tc.settings.speeds[getBaseURL(src)] = {
      speed,
      updated: new Date().valueOf(),
    };

    log('Storing lastSpeed in settings for the rememberSpeed feature', DEBUG);
    tc.settings.lastSpeed = speed;
    log('Syncing chrome settings for lastSpeed', DEBUG);
    chrome.storage.sync.set(
      {
        lastSpeed: speed,
        speeds: tc.settings.speeds,
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
      if (tc.settings.forceLastSavedSpeed) {
        log('Force last-saved speed is ON', DEBUG);
        if (event.detail && event.detail.origin === 'videoSpeed') {
          log(`Setting playbackRate to event.detail's speed (${event.detail.speed})`, DEBUG);
          video.playbackRate = event.detail.speed;
          updateSpeedFromEvent(video);
        } else {
          log(`Setting playbackRate to tc.settings.lastSpeed (${tc.settings.lastSpeed})`, DEBUG);
          video.playbackRate = tc.settings.lastSpeed;
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

// -> initializeWhenReady {{{
function initializeWhenReady(document) {
  log('Begin initializeWhenReady', DEBUG);
  if (isBlacklisted()) {
    return;
  }
  window.onload = () => {
    initializeNow(window.document);
  };
  if (document) {
    if (document.readyState === 'complete') {
      initializeNow(document);
    } else {
      document.onreadystatechange = () => {
        if (document.readyState === 'complete') {
          initializeNow(document);
        }
      };
    }
  }
  log('End initializeWhenReady', DEBUG);
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

  if (node.nodeName === 'VIDEO' || (node.nodeName === 'AUDIO' && tc.settings.audioBoolean)) {
    if (added) {
      log('added', DEBUG);
      node.vsc = new tc.videoController(node, parent);
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

// -> initializeNow {{{
function initializeNow(document) {
  log('Begin initializeNow', DEBUG);
  if (!tc.settings.enabled) return;
  // enforce init-once due to redundant callers
  if (!document.body || document.body.classList.contains('vsc-initialized')) {
    log('no body or body has vsc-initialized', TRACE);
    return;
  }
  try {
    setupListener();
  } catch {
    // no operation
  }
  document.body.classList.add('vsc-initialized');
  log('initializeNow: vsc-initialized added to document body', DEBUG);

  if (document !== window.document) {
    log('adding inject.css to head', TRACE);
    var link = document.createElement('link');
    link.href = chrome.runtime.getURL('inject.css');
    link.type = 'text/css';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
  }
  var docs = Array(document);
  try {
    if (inIframe()) docs.push(window.top.document);
  } catch (e) {}

  // set up keydown event listener for each "doc" {{{
  docs.forEach(function (doc) {

    doc.addEventListener(
      'keydown',
      function (event) {
        const ignoredNodeNames = [
          'TEXTAREA',
          'INPUT',
          'CIB-SERP', // Bing chat has this element
        ];

        // Ignore keydown event if typing in an input box
        if (ignoredNodeNames.includes(event.target.nodeName) || event.target.isContentEditable) {
          return false;
        }

        const keyCode = event.keyCode;
        const shift = event.shiftKey;
        const ctrl = event.ctrlKey;

        log('Processing keydown event: ' + keyCode, TRACE);

        // Ignore if following modifier is active.
        if (
          !event.getModifierState ||
          event.getModifierState('Alt') ||
          event.getModifierState('Control') ||
          event.getModifierState('Fn') ||
          event.getModifierState('Meta') ||
          event.getModifierState('Hyper') ||
          event.getModifierState('OS')
        ) {
          log('Keydown event ignored due to active modifier: ' + keyCode, TRACE);
          return;
        }

        // Ignore keydown event if typing in a page without vsc
        if (!tc.mediaElements.length) {
          return false;
        }

        const item = tc.settings.keyBindings.find(
          (item) => item.key === keyCode && item.shift === shift && item.ctrl === ctrl,
        );

        if (item) {
          runAction({
            action: item.action,
            value: item.value,
          });
          if (item.force === 'true') {
            // disable websites key bindings
            event.preventDefault();
            event.stopPropagation();
          }
        }

        return false;
      },
      true,
    );
  });
  // }}}

  // create MutationObserver {{{
  var observer = new MutationObserver(function (mutations) {
    logGroup('MutationObserver', TRACE);
    log(`MutationObserver called with ${mutations.length} mutations`, TRACE);

    // Process the DOM nodes lazily
    requestIdleCallback(
      () => {
        mutations.forEach(function (mutation) {
          log(`mutation type is ${mutation.type}`, TRACE);

          switch (mutation.type) {
            case 'childList':
              mutation.addedNodes.forEach(function (node) {
                if (typeof node === 'function') return;

                if (node === document.documentElement) {
                  // This happens on sites that use document.write, e.g. watch.sling.com
                  // When the document gets replaced, we lose all event handlers, so we need to reinitialize
                  log('Document was replaced, reinitializing', TRACE);
                  initializeWhenReady(document);
                  return;
                }

                const target = node.parentNode || mutation.target;

                if (!tc.observed.has(target)) {
                  // tc.observed.add(target);
                  log('checkForVideo in chidlListMutation.addedNodes', TRACE, target);
                  checkForVideo(node, target, true);
                } else {
                  log('already observed; skipping', TRACE, target);
                }
              });
              mutation.removedNodes.forEach(function (node) {
                if (typeof node === 'function') return;

                const target = node.parentNode || mutation.target;
                if (!tc.observed.has(target)) {
                  // tc.observed.add(target);
                  log('checkForVideo in chidlListMutation.removedNodes', TRACE, target);
                  checkForVideo(node, target, true);
                } else {
                  log('already observed; skipping', TRACE, target);
                }
              });
              break;
            case 'attributes':
              if (
                (mutation.target.attributes['aria-hidden'] &&
                  mutation.target.attributes['aria-hidden'].value == 'false') ||
                mutation.target.nodeName === 'APPLE-TV-PLUS-PLAYER'
              ) {
                var flattenedNodes = getShadow(document.body);
                var nodes = flattenedNodes.filter((x) => x.tagName == 'VIDEO');
                for (let node of nodes) {
                  // only add vsc the first time for the apple-tv case (the attribute change is triggered every time you click the vsc)
                  if (node.vsc && mutation.target.nodeName === 'APPLE-TV-PLUS-PLAYER') continue;
                  if (node.vsc) node.vsc.remove();

                  const target = node.parentNode || mutation.target;
                  if (!tc.observed.has(target)) {
                    // tc.observed.add(target);
                    log('checkForVideo in attributesMutation', TRACE, target);
                    checkForVideo(node, target, true);
                  } else {
                    log('already observed; skipping', TRACE, target);
                  }
                }
              }
              break;
          }
        });
        logGroupEnd(TRACE);
      },
      { timeout: 1000 },
    );
  });
  // }}}

  observer.observe(document, {
    attributeFilter: ['aria-hidden', 'data-focus-method'],
    childList: true,
    subtree: true,
  });

  let mediaTags = [];
  if (tc.settings.audioBoolean) {
    mediaTags = [...document.querySelectorAll('video,audio')];
  } else {
    mediaTags = [...document.querySelectorAll('video')];
  }

  const shadows = [
    ['shreddit-player'], // Reddit
    ['mux-player', 'mux-video'] // totaltypescript
  ];

  const parents = [];
  const shadowVideos = [];

  shadows.forEach(sh => {
    setTimeout(() => {
      let rootEl = document;
      for (let root of sh) {
        rootEl = rootEl?.querySelector(root);
        if (rootEl) {
          rootEl = rootEl.shadowRoot;
          const video = rootEl.querySelector('video');

          if (video) {
            parents.push(rootEl);
            shadowVideos.push(video);
          }
        }
      }

      shadowVideos.forEach(function (video, idx) {
        video.vsc = new tc.videoController(video, parents[idx]);
      });
    }, 1000);
  });

  mediaTags.forEach(function (video) {
    video.vsc = new tc.videoController(video);
  });

  var frameTags = document.getElementsByTagName('iframe');
  Array.prototype.forEach.call(frameTags, function (frame) {
    // Ignore frames we don't have permission to access (different origin).
    try {
      var childDocument = frame.contentDocument;
    } catch (e) {
      return;
    }
    initializeWhenReady(childDocument);
  });
  log('End initializeNow', DEBUG);
}
// document.addEventListener('onhashchange', () => log('HASH-CHANGE', INFO));
// document.addEventListener('navigate', () => log('NAVIGATE', INFO));
// document.addEventListener('load', () => log('LOOOOOOOOOOOOOOOOAD', INFO));
// document.addEventListener('readystatechange', () => {
//   log('readystatechange', INFO, document.readyState);
//   var flattenedNodes = getShadow(document.body);
//
//   var nodes = flattenedNodes.filter((x) => x.tagName == 'VIDEO');
//   for (let node of nodes) {
//     // only add vsc the first time for the apple-tv case (the attribute change is triggered every time you click the vsc)
//     if (node.vsc && mutation.target.nodeName === 'APPLE-TV-PLUS-PLAYER') continue;
//     if (node.vsc) node.vsc.remove();
//
//     const target = node.parentNode || document.body;
//     log('checkForVideo in attributesMutation', TRACE, target);
//     log(`calling checkForVideo`, INFO, node, target);
//     checkForVideo(node, target, true);
//   }
// });
// }}}

// -> setSpeed {{{
function setSpeed(video, speed) {
  log('setSpeed started: ' + speed, DEBUG, video);

  const src = video.currentSrc;
  const speedvalue = speed.toFixed(2);

  // Not sure when we want dispatch and when playbackRate; added playbackRate
  // in dispatch because dispatch had no effect in reddit (for example).
  if (tc.settings.forceLastSavedSpeed) {
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
  tc.settings.lastSpeed = speed;
  tc.settings.speeds[getBaseURL(src)] = {
    speed,
    updated: new Date().valueOf(),
  };
  chrome.storage.sync.set(
    {
      lastSpeed: speed,
      speeds: tc.settings.speeds,
    },
    () => log('Speed (and SPEEDS) setting saved: ' + speed, DEBUG),
  );
  refreshCoolDown();
  log('setSpeed finished: ' + speed, DEBUG);
}
// }}}

// -> runAction {{{
function runAction({ action, value, e }) {
  const mediaTags = tc.mediaElements;

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

    const percent = value * v.duration / 100;
    const step = Math.min(value, percent);

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
