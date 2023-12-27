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

// vim: foldmethod=marker
