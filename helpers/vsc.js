var vsc = {
  settings: { ...vscDefaults },

  // To keep track of the documents we're adding event listeners to.
  // Maps each doc to its kwydown event listener.
  docs: new Map(),
  docsSet: new Set(),

  // Holds a reference to all of the AUDIO/VIDEO DOM elements we've attached to
  mediaElements: [],

  coolDown: false,

  actionByKeyEvent: (event) => {
    const keyCode = event.keyCode;
    const shift = !!event.shiftKey;
    const ctrl = !!event.ctrlKey;

    return vsc.settings.keyBindings.find(
      (item) => item.key === keyCode && !!item.shift === shift && !!item.ctrl === ctrl,
    );
  },

  actionByName: (actionName) =>
    vsc.settings.keyBindings.find((item) => item.action.name === actionName),
};

// -> vsc.videoController = ... {{{
vsc.videoController = function (target, parent) {
  if (target.vsc) {
    return target.vsc;
  }

  vsc.mediaElements.push(target);

  this.video = target;
  this.parent = target.parentElement || parent;
  let storedSpeed = vsc.settings.speeds[getBaseURL(target.currentSrc)]?.speed || 1.0;

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

  const mediaEventAction = function (event) {
    storedSpeed = vsc.settings.speeds[getBaseURL(event.target.currentSrc)]?.speed || 1.0;

    if (!vsc.settings.rememberSpeed) {
      // resetSpeed isn't really a reset, it's a toggle
      setKeyBindings('reset', getKeyBindings('fast')); // resetSpeed = fastSpeed
    }

    // TODO: Check if explicitly setting the playback rate to 1.0 is
    // necessary when rememberSpeed is disabled (this may accidentally
    // override a website's intentional initial speed setting interfering
    // with the site's default behavior)
    log('Explicitly setting playbackRate to: ' + storedSpeed, DEBUG);
    setSpeed(event.target, storedSpeed);
  };

  const volumeEventAction = function (event) {};

  this.handlePlay = (event) => mediaEventAction(event);
  this.handleVolumeChange = volumeEventAction.bind(event);
  this.handleSeek = (event) => mediaEventAction(event);

  target.addEventListener('play', this.handlePlay);
  target.addEventListener('volumechange', this.handleVolumeChange);
  target.addEventListener('seeked', this.handleSeek);

  var observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (
        mutation.type === 'attributes' &&
        (mutation.attributeName === 'src' || mutation.attributeName === 'currentSrc')
      ) {
        log('mutation of A/V element', DEBUG);

        // document.body.classList.remove('vsc-initialized');
        // vsc.mediaElements = [];
        // vsc.docs.forEach((listener, doc) => {
        //   doc.removeEventListener('keydown', listener, true);
        // });
        // vsc.docs = new Map();
        // initializeWhenReady(document);

        // document.body.classList.remove('vsc-initialized');
        // mutation.target.vsc?.remove();
        //
        // if (location.hostname === 'www.totaltypescript.com') {
        //   vsc.mediaElements = [];
        //   vsc.docs.forEach((listener, doc) => {
        //     doc.removeEventListener('keydown', listener, true);
        //   });
        //   vsc.docs = new Map();
        // } else {
        const controller = this.div;

        if (!mutation.target.src && !mutation.target.currentSrc) {
          controller.classList.add('vsc-nosource');
        } else {
          controller.classList.remove('vsc-nosource');

          setSpeed(this.video);
          this.adjustLocation();
        }
        // }

        // initializeWhenReady(document);
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
  this.video.removeEventListener('volumechange', this.handleVolumeChange);

  delete this.video.vsc;
  let idx = vsc.mediaElements.indexOf(this.video);
  if (idx != -1) {
    vsc.mediaElements.splice(idx, 1);
  }

  vsc.docs.forEach((listener, doc) => doc.removeEventListener('keydown', listener));

  vsc.docs = new Map();
  vsc.docs = new Set();
};
// }}}

// -> vsc.videoController.prototype.initializeControls = ... {{{
vsc.videoController.prototype.initializeControls = function () {
  log('initializeControls Begin', DEBUG);
  const document = this.video.ownerDocument;
  const speed = this.video.playbackRate.toFixed(1);

  const volume = (this.video.volume * 100).toFixed(0);

  this.adjustLocation = () => {
    // getBoundingClientRect is relative to the viewport; style coordinates
    // are relative to offsetParent, so we adjust for that here. offsetParent
    // can be null if the video has `display: none` or is not yet in the DOM.
    const offsetRect = this.video.offsetParent?.getBoundingClientRect();
    const rect = this.video.getBoundingClientRect();

    let top = Math.max(rect.top - (offsetRect?.top || 0), 0);
    let left = Math.max(rect.left - (offsetRect?.left || 0), 0);

    // Couldn't figure out a proper way, so hacking it!
    if (location.hostname.match(/totaltypescript.com/)) {
      top = Math.max(rect.top - (rect?.top || 0), 0);
      left = Math.max(rect.left - (rect?.left || 0), 0);
    }

    this.controller.style.left = `${left}px`;
    this.controller.style.top = `${top}px`;
  };

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

      <div
        id="controller"
        style="top:0; left:0; opacity:${vsc.settings.controllerOpacity}; font-size: ${vsc.settings.controllerButtonSize}px;"
      >
        <span data-action="drag" class="draggable">
          <span id="vsc-speed-val" data-action="drag">${speed}x</span>
          <span id="vsc-volume-val" data-action="drag">(vol: ${volume})</span>
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
    (ev) => {
      runAction({
        actionItem: ev.target.dataset['action'],
        ev,
      });
      ev.preventDefault();
      ev.stopPropagation();
    },
    true,
  );

  shadow.querySelectorAll('button').forEach(function (button) {
    button.addEventListener(
      'click',
      (ev) => {
        const actionItem = vsc.actionByName(ev.target.dataset['action']);

        runAction({
          actionItem,
          ev,
        });
        ev.stopPropagation();
      },
      true,
    );

    button.addEventListener(
      'touchstart',
      (e) => {
        e.stopPropagation();
      },
      true,
    );
  });

  shadow.querySelector('#controller').addEventListener('click', (e) => e.stopPropagation(), false);
  shadow
    .querySelector('#controller')
    .addEventListener('mousedown', (e) => e.stopPropagation(), false);

  shadow.querySelector('#controller').addEventListener('wheel', wheelListener, { passive: false });

  this.setSpeedVal = (value) => (this.speedIndicator.textContent = `${Number(value).toFixed(1)}x`);
  this.setVolumeVal = (value) =>
    (this.volumeIndicator.textContent = `(vol: ${(Number(value) * 100).toFixed(0)})`);

  this.speedIndicator = shadow.querySelector('span#vsc-speed-val');
  this.volumeIndicator = shadow.querySelector('span#vsc-volume-val');
  this.controller = shadow.querySelector('div#controller');

  var fragment = document.createDocumentFragment();
  fragment.appendChild(wrapper);

  this.adjustLocation();

  switch (true) {
    // Only special-case Prime Video, not product-page videos (which use
    // "vjs-tech"), otherwise the overlay disappears in fullscreen mode
    case location.hostname == 'www.amazon.com' && !this.video.classList.contains('vjs-tech'):
    case location.hostname == 'www.reddit.com':
    case /hbogo\./.test(location.hostname):
      // insert before parent to bypass overlay
      this.parent?.parentElement?.insertBefore(fragment, this.parent);
      // this.parent.parentElement.insertBefore(fragment, this.parent);
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
    case location.hostname == 'www.youtube.com':
      // sometimes, the controller gets buried under the video
      // by inserting it at the parent level, we ensure that it's on top
      let parent = this.parent.parentElement;
      parent.insertBefore(fragment, parent.firstChild);
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
  log('initializeControls End', DEBUG);
  return wrapper;
};
// }}}

// vim: foldmethod=marker
