function setupRateChangeListener() {
  log('Begin setupRateChangeListener', DEBUG);
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

    log('Playback rate changed to ' + speed, DEBUG);

    log('Updating controller with new speed', DEBUG);
    speedIndicator.textContent = speed.toFixed(2);

    const url = getBaseURL(src);
    syncSpeedValue({ speed, url });

    // show the controller for 1000ms if it's hidden.
    runAction({ action: 'blink' });
  }

  document.addEventListener(
    'vscsetspeed',
    (event) => {
      // console.log('fmfoo vscsetspeed', event);
    },
    true,
  );

  document.addEventListener(
    'ratechange',
    (event) => {
      // Disabling cooldown since, eg., the speed is not updated on the video! :/
      // if (vsc.coolDown) {
      //   log('ratechange handler: speed event propagation blocked', DEBUG);
      //   event.stopImmediatePropagation();
      //   event.preventDefault();
      //   event.stopPropagation();
      //   return;
      // }

      log('handling ratechange event', DEBUG);

      /**
       * Normally we'd do 'event.target' here. But that doesn't work with shadow DOMs. For
       * an event that bubbles up out of a shadow DOM, event.target is the root of the shadow
       * DOM. For 'open' shadow DOMs, event.composedPath()[0] is the actual element that will
       * first receive the event, and it's equivalent to event.target in non-shadow-DOM cases.
       */
      var video = event.composedPath()[0];

      if (vsc.settings.forceLastSavedSpeed) {
        event.stopImmediatePropagation();
      }

      setSpeed(video);

      /**
       * If the last speed is forced, only update the speed based on events created by
       * video speed instead of all video speed change events.
       */
      // if (vsc.settings.forceLastSavedSpeed) {
      //   log('Force last-saved speed is ON', DEBUG);
      //   if (event.detail && event.detail.origin === 'videoSpeed') {
      //     log(`Setting playbackRate to event.detail's speed (${event.detail.speed})`, DEBUG);
      //     video.playbackRate = event.detail.speed;
      //     updateSpeedFromEvent(video);
      //   } else {
      //     log(`Setting playbackRate to vsc.settings.lastSpeed (${vsc.settings.lastSpeed})`, DEBUG);
      //     video.playbackRate = vsc.settings.lastSpeed;
      //   }
      //   event.stopImmediatePropagation();
      // } else {
      //   log("Force last-saved speed is OFF; calling 'updateSpeedFromEvent'", DEBUG);
      //   updateSpeedFromEvent(video);
      // }
    },
    true,
  );
  log('End setupRateChangeListener', DEBUG);
}

// vim: foldmethod=marker
