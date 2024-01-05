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

    const actionItem = vsc.actionByKeyEvent(event);

    if (actionItem) {
      runAction({ actionItem });

      if (actionItem.force) {
        // disable websites key bindings
        event.preventDefault();
        event.stopPropagation();
      }
    }

    return false;
  };
