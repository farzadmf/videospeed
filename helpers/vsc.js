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
    `.replace(REG_STRIP, ''),
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

// -> vsc.videoController = ... {{{
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

        if (location.hostname === 'www.totaltypescript.com') {
          document.body.classList.remove('vsc-initialized');
          vsc.mediaElements = [];
          vsc.docs.forEach((listener, doc) => {
            doc.removeEventListener('keydown', listener, true);
          });
          vsc.docs = new Map();
          initializeWhenReady(document);
        } else {
          const controller = this.div;
          if (!mutation.target.src && !mutation.target.currentSrc) {
            controller.classList.add('vsc-nosource');
          } else {
            controller.classList.remove('vsc-nosource');
          }
        }
      }
    });
  });
  observer.observe(target, {
    attributeFilter: ['src', 'currentSrc'],
  });
};
// }}}

// -> vsc.videoController.prototype.remove = ... {{{
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

// -> vsc.videoController.prototype.initializeControls = ... {{{
vsc.videoController.prototype.initializeControls = function () {
  log('initializeControls Begin', DEBUG);
  const document = this.video.ownerDocument;
  const speed = this.video.playbackRate.toFixed(1);
  const volume = (this.video.volume * 100).toFixed(0);
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
        <span data-action="drag" class="draggable">
          <span id="vsc-speed-val">${speed}x</span>
          <span id="vsc-volume-val">(vol: ${volume})</span>
        </span>
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

  this.speedIndicator = shadow.querySelector('span#vsc-speed-val');
  this.volumeIndicator = shadow.querySelector('span#vsc-volume-val');
  this.setSpeedVal = (value) => (this.speedIndicator.textContent = `${Number(value).toFixed(1)}x`);
  this.setVolumeVal = (value) =>
    (this.volumeIndicator.textContent = `(vol: ${(Number(value) * 100).toFixed(0)})`);

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
      this.parent.insertBefore(fragment, this.parent.firstChild);
  }
  return wrapper;
};
// }}}

// vim: foldmethod=marker
