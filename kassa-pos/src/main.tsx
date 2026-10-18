import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/index.css';
import { I18nProvider } from './i18n/i18nContext';
import { ToastProvider, ToastViewport } from './components/ui/Toast';
import { Toaster } from './components/Toaster';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <I18nProvider>
      <ToastProvider>
        <App />
        <Toaster />
        <ToastViewport />
      </ToastProvider>
    </I18nProvider>
  </React.StrictMode>
);
