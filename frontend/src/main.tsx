import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// El Service Worker se registra dentro de App, para poder mostrar el aviso de
// "nueva versión disponible" usando la interfaz de React.
ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
