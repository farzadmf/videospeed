import _ from 'lodash';

import { AudioVideoNode, Options } from '@/options/types';
import { getBaseURL, inIframe, isLocationMatch } from '@/shared/helpers';

import { Contrls } from './controls';
import { OBSERVE_OPTIONS, docShadowRootMutationCallback } from './document-observer';

export class VideoControler {
  readonly _options: Options;
  private _nodes: Set<AudioVideoNode>;
  // Intentionally naming it "doc" because "document" is a known global, and if I
  //  forget to do 'this.document' and only 'document', it thinks it's fine!
  private _document?: Document = undefined;
  private _documentAndShadowRootObserver?: MutationObserver = undefined;
  private _controls: Map<AudioVideoNode, Contrls>;

  constructor(options: Options) {
    this._options = options;
    this._nodes = new Set();
    this._controls = new Map();

    this._documentAndShadowRootObserver = new MutationObserver(
      docShadowRootMutationCallback({
        addNode: this.addNode.bind(this),
        removeNode: this.removeNode.bind(this),
        observeNode: this.observeNode.bind(this),
        initializeWhenReady: this.initializeWhenReady.bind(this),
        nodes: this._nodes,
        options: this._options,
      }),
    );

    this.initializeWhenReady();
  }

  initializeWhenReady() {
    if (this.isBlacklisted()) {
      return;
    }

    this._document = window.document;

    window.onload = () => {
      this.initializeNow();
    };
    if (this._document) {
      if (this._document.readyState === 'complete') {
        this.initializeNow();
      } else {
        this._document.onreadystatechange = () => {
          if (this._document?.readyState === 'complete') {
            this.initializeNow();
          }
        };
      }
    }
  }

  initializeNow() {
    // Check location.host to be set to not add, eg., about:blank
    if (!this._document?.location.host) return;
    if (!this._options.enabled) return;

    if (!this._document.body || this._document.body.classList.contains('vsc-initialized')) {
      return;
    }

    this.setupRateChangeListener();
    this._document.body.classList.add('vsc-initialized');

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
    } catch (e) {
      /* ignore */
    }

    this._documentAndShadowRootObserver?.observe(this._document, OBSERVE_OPTIONS);
  }

  isBlacklisted(): boolean {
    const list = this._options.blacklist.split('\n');
    return Boolean(_.find(list, (loc) => isLocationMatch(loc)));
  }

  setupRateChangeListener() {
    this._document?.addEventListener(
      'ratechange',
      (event) => {
        const video = event.target as HTMLVideoElement;
        const src = video.currentSrc;

        if (!src) return;

        const url = getBaseURL(src);
        if (!url) return;

        if (this._options.forceLastSavedSpeed) {
          event.stopImmediatePropagation();

          // const speed = this.options.speeds[url]?.speed || 1.0;
          // setSpeed(video, speed);
        }
      },
      true,
    );
  }

  addNode(node: AudioVideoNode): void {
    if (this._nodes.has(node)) return;

    this._nodes.add(node);
    this._controls.set(node, new Contrls({ audioVideo: node }));
  }

  removeNode(node: AudioVideoNode): void {
    console.log('🪚 removeNode:', node);
  }

  observeNode(node: Node): void {
    this._documentAndShadowRootObserver!.observe(node, OBSERVE_OPTIONS);
  }
}
