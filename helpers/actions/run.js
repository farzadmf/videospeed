function runAction({ action, value, value2, e }) {
  log('runAction Start', DEBUG);

  const mediaTags = vsc.mediaElements;

  // Get the controller that was used if called from a button press event e
  if (e) {
    var targetController = e.target.getRootNode().host;
  }

  mediaTags.forEach(function (v) {
    if (!v || !action) return;

    var controller = v.vsc.div;

    // Don't change video speed if the video has a different controller
    if (e && !(targetController == controller)) {
      log('runAction e, targetController, controller', DEBUG, e, targetController, controller);
      return;
    }

    const percent = (value * v.duration) / 100;
    const step = Math.min(value2 || 5, percent); // Only used for rewind and advance

    showController(controller);

    if (v.classList.contains('vsc-cancelled')) return;

    if (action.startsWith('fixspeed')) {
      const speedValue = Number(action.split('-')[1]);
      setSpeed(v, speedValue);
      return;
    }

    switch (action) {
      case 'rewind':
        log('Rewind', DEBUG);
        v.currentTime -= step;
        break;
      case 'advance':
        log('Fast forward', DEBUG);
        v.currentTime += step;
        break;
      case 'faster':
        log('Increase speed', DEBUG);
        // Maximum playback speed in Chrome is set to 16:
        // https://cs.chromium.org/chromium/src/third_party/blink/renderer/core/html/media/html_media_element.cc?gsn=kMinRate&l=166
        var s = Math.min((v.playbackRate < 0.1 ? 0.0 : v.playbackRate) + value, 16);
        setSpeed(v, s);
        break;
      case 'slower':
        log('Decrease speed', DEBUG);
        // Video min rate is 0.0625:
        // https://cs.chromium.org/chromium/src/third_party/blink/renderer/core/html/media/html_media_element.cc?gsn=kMinRate&l=165
        var s = Math.max(v.playbackRate - value, 0.07);
        setSpeed(v, s);
        break;
      case 'vol-up':
        log('Increase volume', DEBUG);
        v.volume = Math.min(1, v.volume + value);
        v.vsc.setVolumeVal(v.volume);
        break;
      case 'vol-down':
        log('Decrease volume', DEBUG);
        v.volume = Math.max(0, v.volume - value);
        v.vsc.setVolumeVal(v.volume);
        break;
      case 'reset':
        log('Reset speed', DEBUG);
        resetSpeed(v, 1.0);
        break;
      case 'go-start':
        log('Go to video start', DEBUG);
        v.currentTime = 0;
        break;
      case 'display':
        log('Showing controller', DEBUG);
        controller.classList.add('vsc-manual');
        controller.classList.toggle('vsc-hidden');
        break;
      case 'blink':
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
        break;
      case 'drag':
        handleDrag(v, e);
        break;
      case 'fast':
        resetSpeed(v, value);
        break;
      case 'pause':
        pause(v);
        break;
      case 'muted':
        muted(v);
        break;
      case 'mark':
        setMark(v);
        break;
      case 'jump':
        jumpToMark(v);
        break;
    }
  });
  log('runAction End', DEBUG);
}
