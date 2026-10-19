import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/index.css';
import { I18nProvider } from './i18n/i18nContext';
import { ToastHost } from './components/ui/toast-host';
import { useSettingsStore } from './stores/settingsStore';

document.documentElement.dataset.theme = useSettingsStore.getState().theme;

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <I18nProvider>
      <ToastHost>
        <App />
      </ToastHost>
    </I18nProvider>
  </React.StrictMode>,
);
