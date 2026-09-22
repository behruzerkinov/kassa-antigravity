import React, { useEffect, useState } from 'react';
import { useAuthStore } from './stores/authStore';
import { LoginPage } from './pages/LoginPage';
import { LockScreen } from './pages/LockScreen';
import { AppLayout } from './layouts/AppLayout';

export function App() {
  const { isAuthenticated, isLocked, validateSession } = useAuthStore();
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    const init = async () => {
      if (isAuthenticated) {
        await validateSession();
      }
      setIsInitializing(false);
    };
    init();
  }, [isAuthenticated, validateSession]);

  if (isInitializing) {
    return (
      <div className="flex h-screen items-center justify-center bg-surface">
        <div className="text-ink-muted">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  if (isLocked) {
    return <LockScreen />;
  }

  return <AppLayout />;
}

export default App;
