import React from 'react';
import ReactDOM from 'react-dom/client';

import { AudioVideoNode } from '@/options/types';

import { App } from './play2';

export class Contrls {
  private _audioVideo: AudioVideoNode;

  constructor({ audioVideo }: { audioVideo: AudioVideoNode }) {
    console.log("🪚 i'm building for", audioVideo);
    this._audioVideo = audioVideo;

    const div = document.createElement('div');
    audioVideo.parentNode?.parentNode?.appendChild(div);
    const root = ReactDOM.createRoot(div);

    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>,
      // <div className="t-absolute t-top-[20px] t-left-[80px]">
      //   <div className="t-flex t-flex-col">
      //     <button className="t-d-btn t-d-btn-primary">BUTTON 1</button>
      //     <button className="t-d-btn t-d-btn-primary">BUTTON 2</button>
      //     <button className="t-d-btn t-d-btn-primary">BUTTON 3</button>
      //   </div>
      // </div>,
    );

    console.log('🪚 div added?', div);
  }
}
