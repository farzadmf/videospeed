const mediaEventAction = (event) => {
  const storedSpeed = this.settings.speeds[getBaseURL(event.target.currentSrc)]?.speed || 1.0;

  if (!this.settings.rememberSpeed) {
    if (!storedSpeed) {
      log('Overwriting stored speed to 1.0 (rememberSpeed not enabled)', DEBUG);
      storedSpeed = 1.0;
    }
    // resetSpeed isn't really a reset, it's a toggle
    log('Setting reset keybinding to fast', DEBUG);
    setKeyBindings('reset', getKeyBindings('fast')); // resetSpeed = fastSpeed
  } else {
  }
  log('Explicitly setting playbackRate to: ' + storedSpeed, DEBUG);
  setSpeed(event.target, storedSpeed);
};
