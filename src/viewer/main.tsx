import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../styles/index.css';
import './viewer.css';
import ViewerApp from './ViewerApp.tsx';
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ViewerApp />
  </StrictMode>,
);
