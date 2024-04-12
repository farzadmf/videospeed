import React from 'react';
import ReactDOM from 'react-dom/client';

import '@/shared/index.css';

import { Popup } from './main';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Popup />
  </React.StrictMode>,
);
