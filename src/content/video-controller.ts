import { Options } from '@/options/types';
import { getBaseURL, inIframe, isLocationMatch } from '@/shared/helpers';
import _ from 'lodash';

export class VideoControler {
  readonly options: Options;
  // Intentionally naming it "doc" because "document" is a known global, and if I
  //  forget to do 'this.document' and only 'document', it thinks it's fine!
  private doc?: Document = undefined;

  constructor(options: Options) {
    this.options = options;
  }

  initializeWhenReady() {
    if (this.isBlacklisted()) {
      return;
    }

    this.doc = window.document;

    window.onload = () => {
      this.initializeNow();
    };
    if (document) {
      if (document.readyState === 'complete') {
        this.initializeNow();
      } else {
        document.onreadystatechange = () => {
          if (document.readyState === 'complete') {
            this.initializeNow();
          }
        };
      }
    }
  }

  initializeNow() {
    // Check location.host to be set to not add, eg., about:blank
    if (!this.doc?.location.host) return;
    if (!this.options.enabled) return;

    if (!this.doc.body || this.doc.body.classList.contains('vsc-initialized')) {
      return;
    }

    this.setupRateChangeListener();
    this.doc.body.classList.add('vsc-initialized');

    if (document !== window.document) {
      const link = document.createElement('link');
      link.href = chrome.runtime.getURL('inject.css');
      link.type = 'text/css';
      link.rel = 'stylesheet';
      document.head.appendChild(link);
    }

    const docs = Array(document);
    try {
      if (inIframe() && !!window?.top?.document?.location.host) docs.push(window.top.document);
    } catch (e) {}
  }

  isBlacklisted(): boolean {
    const list = this.options.blacklist.split('\n');
    return Boolean(_.find(list, (loc) => isLocationMatch(loc)));
  }

  setupRateChangeListener() {
    this.doc?.addEventListener(
      'ratechange',
      (event) => {
        const video = event.target as HTMLVideoElement;
        const src = video.currentSrc;

        if (!src) return;

        const url = getBaseURL(src);
        if (!url) return;

        if (this.options.forceLastSavedSpeed) {
          event.stopImmediatePropagation();

          const speed = this.options.speeds[url]?.speed || 1.0;
          setSpeed(video, speed);
        }
      },
      true,
    );
  }
}
