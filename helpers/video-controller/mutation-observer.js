const createMutationObserver = (controller) =>
  new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (
        mutation.type === 'attributes' &&
        (mutation.attributeName === 'src' || mutation.attributeName === 'currentSrc')
      ) {
        log('mutation of A/V element', DEBUG);

        // document.body.classList.remove('vsc-initialized');
        // controller.mediaElements = [];
        // controller.docs.forEach((listener, doc) => {
        //   doc.removeEventListener('keydown', listener, true);
        // });
        // controller.docs = new Map();
        // initializeWhenReady(document);

        if (location.hostname === 'www.totaltypescript.com') {
          document.body.classList.remove('vsc-initialized');
          controller.mediaElements = [];
          controller.docs.forEach((listener, doc) => {
            doc.removeEventListener('keydown', listener, true);
          });
          controller.docs = new Map();
          initializeWhenReady(document);
        } else {
          const controllerDiv = this.div;
          if (!mutation.target.src && !mutation.target.currentSrc) {
            controllerDiv.classList.add('vsc-nosource');
          } else {
            controllerDiv.classList.remove('vsc-nosource');
          }
        }
      }
    });
  });
