import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './AppNew.tsx';
import './index.css';
import { applyRouteMetadata } from './lib/seo';

const pathname = window.location.pathname;
applyRouteMetadata(pathname);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
