// -> initializeWhenReady {{{
function initializeWhenReady(document) {
  log('Begin initializeWhenReady', DEBUG);
  if (isBlacklisted()) {
    return;
  }
  window.onload = () => {
    initializeNow(window.document);
  };
  if (document) {
    if (document.readyState === 'complete') {
      initializeNow(document);
    } else {
      document.onreadystatechange = () => {
        if (document.readyState === 'complete') {
          initializeNow(document);
        }
      };
    }
  }
  log('End initializeWhenReady', DEBUG);
}
// }}}

// -> initializeNow {{{
function initializeNow(document) {
  log('Begin initializeNow', DEBUG);
  if (!vsc.settings.enabled) return;
  // enforce init-once due to redundant callers
  if (!document.body || document.body.classList.contains('vsc-initialized')) {
    log('no body or body has vsc-initialized', DEBUG);
    return;
  }
  try {
    setupListener();
  } catch {
    // no operation
  }
  document.body.classList.add('vsc-initialized');
  log('initializeNow: vsc-initialized added to document body', DEBUG);

  if (document !== window.document) {
    log('adding inject.css to head', DEBUG);
    var link = document.createElement('link');
    link.href = chrome.runtime.getURL('inject.css');
    link.type = 'text/css';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
  }
  docs = Array(document);
  try {
    if (inIframe()) docs.push(window.top.document);
  } catch (e) {}

  // set up keydown event listener for each "doc" {{{
  docs.forEach(function (doc) {
    const listener = function (event) {
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
      const shift = event.shiftKey;
      const ctrl = event.ctrlKey;

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
        (item) => item.key === keyCode && item.shift === shift && item.ctrl === ctrl,
      );

      if (item) {
        runAction({
          action: item.action,
          value: item.value,
          value2: item.value2,
        });
        if (item.force === 'true') {
          // disable websites key bindings
          event.preventDefault();
          event.stopPropagation();
        }
      }

      return false;
    };

    vsc.docs.set(doc, listener);

    doc.addEventListener('keydown', vsc.docs.get(doc), true);
  });

  // }}}

  // create MutationObserver {{{
  var observer = new MutationObserver(function (mutations) {
    logGroup('MutationObserver', TRACE);
    log(`MutationObserver called with ${mutations.length} mutations`, TRACE);

    // Process the DOM nodes lazily
    requestIdleCallback(
      () => {
        mutations.forEach(function (mutation) {
          log(`mutation type is ${mutation.type}`, TRACE);

          switch (mutation.type) {
            case 'childList':
              mutation.addedNodes.forEach(function (node) {
                if (typeof node === 'function') return;

                if (node === document.documentElement) {
                  // This happens on sites that use document.write, e.g. watch.sling.com
                  // When the document gets replaced, we lose all event handlers, so we need to reinitialize
                  log('Document was replaced, reinitializing', TRACE);
                  initializeWhenReady(document);
                  return;
                }

                const target = node.parentNode || mutation.target;

                if (!vsc.observed.has(target)) {
                  // vsc.observed.add(target);
                  log('checkForVideo in chidlListMutation.addedNodes', TRACE, target);
                  checkForVideo(node, target, true);
                } else {
                  log('already observed; skipping', TRACE, target);
                }
              });
              mutation.removedNodes.forEach(function (node) {
                if (typeof node === 'function') return;

                const target = node.parentNode || mutation.target;
                if (!vsc.observed.has(target)) {
                  // vsc.observed.add(target);
                  log('checkForVideo in chidlListMutation.removedNodes', TRACE, target);
                  checkForVideo(node, target, true);
                } else {
                  log('already observed; skipping', TRACE, target);
                }
              });
              break;
            case 'attributes':
              if (
                (mutation.target.attributes['aria-hidden'] &&
                  mutation.target.attributes['aria-hidden'].value == 'false') ||
                mutation.target.nodeName === 'APPLE-TV-PLUS-PLAYER'
              ) {
                var flattenedNodes = getShadow(document.body);
                var nodes = flattenedNodes.filter((x) => x.tagName == 'VIDEO');
                for (let node of nodes) {
                  // only add vsc the first time for the apple-tv case (the attribute change is triggered every time you click the vsc)
                  if (node.vsc && mutation.target.nodeName === 'APPLE-TV-PLUS-PLAYER') continue;
                  if (node.vsc) node.vsc.remove();

                  const target = node.parentNode || mutation.target;
                  if (!vsc.observed.has(target)) {
                    // vsc.observed.add(target);
                    log('checkForVideo in attributesMutation', TRACE, target);
                    checkForVideo(node, target, true);
                  } else {
                    log('already observed; skipping', TRACE, target);
                  }
                }
              }
              break;
          }
        });
        logGroupEnd(TRACE);
      },
      { timeout: 1000 },
    );
  });
  // }}}

  observer.observe(document, {
    attributeFilter: ['aria-hidden', 'data-focus-method'],
    childList: true,
    subtree: true,
  });

  let mediaTags = [];
  if (vsc.settings.audioBoolean) {
    mediaTags = [...document.querySelectorAll('video,audio')];
  } else {
    mediaTags = [...document.querySelectorAll('video')];
  }

  const shadows = [
    ['shreddit-player'], // Reddit
    ['mux-player', 'mux-video'], // totaltypescript
  ];

  const parents = [];
  const shadowVideos = [];

  shadows.forEach((sh) => {
    setTimeout(() => {
      let rootEl = document;
      for (let root of sh) {
        rootEl = rootEl?.querySelector(root);
        if (rootEl) {
          rootEl = rootEl.shadowRoot;
          const video = rootEl.querySelector('video');

          if (video) {
            parents.push(rootEl);
            shadowVideos.push(video);
          }
        }
      }

      shadowVideos.forEach(function (video, idx) {
        video.vsc = new vsc.videoController(video, parents[idx]);
      });
    }, 1000);
  });

  mediaTags.forEach(function (video) {
    video.vsc = new vsc.videoController(video);
  });

  var frameTags = document.getElementsByTagName('iframe');
  Array.prototype.forEach.call(frameTags, function (frame) {
    // Ignore frames we don't have permission to access (different origin).
    try {
      var childDocument = frame.contentDocument;
    } catch (e) {
      return;
    }
    initializeWhenReady(childDocument);
  });
  log('End initializeNow', DEBUG);
}
// }}}

// vim: foldmethod=marker
