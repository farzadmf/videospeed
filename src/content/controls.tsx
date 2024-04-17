import React from 'react';
import ReactDOM from 'react-dom/client';

import { AudioVideoNode } from '@/options/types';

import styles from './index.css?inline';
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
    // document.body.appendChild(container);
    audioVideo.parentNode?.parentNode?.appendChild(container);
    const root = ReactDOM.createRoot(shadow);

    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>,
      // <div className="t-absolute t-top-[20px] t-left-[80px]">
      //   <div className="t-flex t-flex-col">
      //     <button className="vu-btn vu-btn-primary">BUTTON 1</button>
      //     <button className="vu-btn vu-btn-primary">BUTTON 2</button>
      //     <button className="vu-btn vu-btn-primary">BUTTON 3</button>
      //   </div>
      // </div>,
    );

    alert('🪚 div added?');
    console.log('🪚 div added?', container);
  }
}
