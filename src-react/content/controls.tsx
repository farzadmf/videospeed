import React from 'react';
import ReactDOM from 'react-dom/client';

import { AudioVideoNode } from '@/options/types';
import styles from '@/shared/index.css?inline';

import { App } from './play2';

export class Contrls {
  private _audioVideo: AudioVideoNode;

  constructor({ audioVideo }: { audioVideo: AudioVideoNode }) {
    console.log("🪚 i'm building for", audioVideo);
    this._audioVideo = audioVideo;

    const container = document.createElement('div');
    const shadow = container.attachShadow({ mode: 'open' });
    const globalStyleSheet = new CSSStyleSheet();
    globalStyleSheet.replaceSync(styles);

    shadow.adoptedStyleSheets = [globalStyleSheet];
    audioVideo.parentNode?.parentNode?.appendChild(container);
    const root = ReactDOM.createRoot(shadow);

    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>,
    );

    alert('🪚 div added?');
    console.log('🪚 div added?', container);
  }
}
