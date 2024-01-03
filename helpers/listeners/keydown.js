const keyDownListener = () =>
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
    const shift = !!event.shiftKey;
    const ctrl = !!event.ctrlKey;

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
    if (!vsc.mediaElements.length) {
      return false;
    }

    const item = vsc.settings.keyBindings.find(
      (item) => item.key === keyCode && !!item.shift === shift && !!item.ctrl === ctrl,
    );

    if (item) {
      runAction({
        action: item.action,
        value: item.value || item.action.value,
        value2: item.value2 || item.action.value2,
      });
      if (item.force) {
        // disable websites key bindings
        event.preventDefault();
        event.stopPropagation();
      }
    }

    return false;
  };
