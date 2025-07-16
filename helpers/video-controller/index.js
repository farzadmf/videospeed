class VideoController {
  docs = new Map();
  mediaElements = [];

  settings = {
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
  };

  constructor(target, parent) {
    if (target.controller) {
      return target.controller;
    }

    this.mediaElements.push(target);

    this.video = target;
    this.parent = target.parentElement || parent;
    const storedSpeed = this.settings.sources[getBaseURL(target.currentSrc)]?.speed || 1.0;

    if (!this.settings.rememberSpeed) {
      setKeyBindings('reset', getKeyBindings('fast')); // resetSpeed = fastSpeed
    }

    log('Explicitly setting playbackRate to: ' + storedSpeed, DEBUG);
    target.playbackRate = storedSpeed;

    this.div = this.initializeControls();

    target.addEventListener('play', (this.handlePlay = mediaEventAction.bind(this)));
    target.addEventListener('seeked', (this.handleSeek = mediaEventAction.bind(this)));

    var observer = createMutationObserver(this);

    observer.observe(target, {
      attributeFilter: ['src', 'currentSrc'],
    });
  }
}
