// checkForVideo {{{
function checkForVideo(node, parent, added) {
  // This function is called QUITE a few times, so logs are SUPER noisy!
  // log('Begin checkForVideo', DEBUG);

  if (node.nodeName === 'VIDEO' || (node.nodeName === 'AUDIO' && vsc.settings.audioBoolean)) {
    if (added && !node.vsc) {
      log('node added', DEBUG, node);

      if (!node.vsc) {
        log('node does not have vsc on it', DEBUG, node);
        node.vsc = new vsc.videoController(node, parent);
      } else {
        log('node already has vsc on it', DEBUG, node.vsc);
      }
      // Only proceed with supposed removal if node is missing from DOM
    } else if (!document.body?.contains(node)) {
      log('node removed; removing vsc', DEBUG, node);
      if (node.vsc) {
        node.vsc.remove();
      }
    }
  } else if (node.children != undefined) {
    log(
      `node has ${node.children.length} children; checkForVideo on each`,
      TRACE,
      node.nodeName,
      node,
    );

    for (var i = 0; i < node.children.length; i++) {
      const child = node.children[i];
      checkForVideo(child, child.parentNode || parent, added);
    }
  }
  // log('End checkForVideo', DEBUG);
}
// }}}

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

function initializeNow(document) {
  // Check location.host to be set to not add, eg., about:blank
  if (!document.location.host) return;

  log('Begin initializeNow', DEBUG);
  if (!vsc.settings.enabled) return;
  // enforce init-once due to redundant callers
  if (!document.body || document.body.classList.contains('vsc-initialized')) {
    log('no body or body has vsc-initialized', DEBUG);
    return;
  }
  try {
    setupRateChangeListener();
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
    if (inIframe() && !!window.top.document.host) docs.push(window.top.document);
  } catch (e) {}

  logGroup('DOCS', DEBUG);
  docs.forEach((d, i) => log(`doc #${i}`, d.location, d));
  logGroupEnd();

  // set up keydown event listener for each "doc" {{{
  docs.forEach(function (doc) {
    const listener = keyDownListener();
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

                log('checkForVideo in chidlListMutation.addedNodes', TRACE, target);
                checkForVideo(node, target, true);
              });
              mutation.removedNodes.forEach(function (node) {
                if (typeof node === 'function') return;

                const target = node.parentNode || mutation.target;
                log('checkForVideo in chidlListMutation.removedNodes', TRACE, target);
                checkForVideo(node, target, false);
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
                  log('checkForVideo in attributesMutation', TRACE, target);
                  checkForVideo(node, target, true);
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

// vim: foldmethod=marker
