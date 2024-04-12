import React from 'react';
import ReactDOM from 'react-dom/client';

import './index.css';
import { App } from './play2';

const div = document.createElement('div');
div.id = '__vu_root';
document.body.appendChild(div);

const rootContainer = document.querySelector('#__vu_root');
if (!rootContainer) throw new Error("Can't find Options root element");
const root = ReactDOM.createRoot(rootContainer);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
