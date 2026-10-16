import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import '@fontsource-variable/public-sans';
import '@fontsource-variable/newsreader';
import './styles/app.css';
import { App } from './App.jsx';
import { AuthProvider, MetaProvider } from './state.jsx';
import { ToastProvider } from './components/ui.jsx';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <MetaProvider>
            <App />
          </MetaProvider>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
