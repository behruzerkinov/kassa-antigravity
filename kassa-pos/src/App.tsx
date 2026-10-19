import React, { useEffect, useState } from 'react';
import { useAuthStore } from './stores/authStore';
import { LoginPage } from './pages/LoginPage';
import { LockScreen } from './pages/LockScreen';
import { AppLayout } from './layouts/AppLayout';
import { useSettingsStore } from './stores/settingsStore';
import { BarcodeMark } from './components/BarcodeMark';
import { useTranslation } from './i18n/i18nContext';
import { UpdateProgressBar } from './components/UpdateProgressBar';

export function App() {
  const { isAuthenticated, isLocked, validateSession } = useAuthStore();
  const { t } = useTranslation();
  const theme = useSettingsStore((state) => state.theme);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    const init = async () => {
      // A persisted token survives relaunch; validate it before showing the app.
      if (useAuthStore.getState().token) await validateSession();
      setIsInitializing(false);
    };
    void init();
    // Session validation intentionally runs once, on boot.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (isInitializing) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 bg-counter">
        <BarcodeMark className="h-6 w-16 text-ink" />
        <p className="text-[13px] text-ink-soft">{t('app.loading')}</p>
      </div>
    );
  }

  let content = <AppLayout />;
  if (!isAuthenticated) content = <LoginPage />;
  else if (isLocked) content = <LockScreen />;

  return (
    <>
      {content}
      <UpdateProgressBar />
    </>
  );
}

export default App;
