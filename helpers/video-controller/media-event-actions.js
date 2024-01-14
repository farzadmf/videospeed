const mediaEventAction = (event) => {
  const storedSpeed = this.settings.speeds[getBaseURL(event.target.currentSrc)]?.speed || 1.0;

  if (!this.settings.rememberSpeed) {
    // resetSpeed isn't really a reset, it's a toggle
    log('Setting reset keybinding to fast', DEBUG);
    setKeyBindings('reset', getKeyBindings('fast')); // resetSpeed = fastSpeed
  }

  // TODO: Check if explicitly setting the playback rate to 1.0 is
  // necessary when rememberSpeed is disabled (this may accidentally
  // override a website's intentional initial speed setting interfering
  // with the site's default behavior)
  log('Explicitly setting playbackRate to: ' + storedSpeed, DEBUG);
  setSpeed(event.target, storedSpeed);
};
