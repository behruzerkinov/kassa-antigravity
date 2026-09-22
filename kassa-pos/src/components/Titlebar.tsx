import React, { useEffect, useState } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { useTranslation } from '../i18n/i18nContext';

export function Titlebar() {
  const [isMaximized, setIsMaximized] = useState(false);
  const { t } = useTranslation();
  const appWindow = getCurrentWindow();

  useEffect(() => {
    let unlisten: () => void;
    
    const checkMaximized = async () => {
      const maximized = await appWindow.isMaximized();
      setIsMaximized(maximized);
    };

    checkMaximized();

    const setupListener = async () => {
      unlisten = await appWindow.onResized(async () => {
        checkMaximized();
      });
    };

    setupListener();

    return () => {
      if (unlisten) unlisten();
    };
  }, [appWindow]);

  const minimize = () => appWindow.minimize();
  const toggleMaximize = async () => {
    await appWindow.toggleMaximize();
  };
  const close = () => appWindow.close();

  return (
    <div
      data-tauri-drag-region
      className="h-[36px] flex items-center justify-between select-none bg-surface-raised border-b border-border"
    >
      <div className="flex items-center px-4" data-tauri-drag-region>
        <span className="font-medium text-sm text-ink pointer-events-none">{t('titlebar.title')}</span>
      </div>
      
      <div className="flex h-full">
        <button
          onClick={minimize}
          className="h-full px-4 hover:bg-black/5 text-ink-muted hover:text-ink transition-colors flex items-center justify-center"
          tabIndex={-1}
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
            <rect x="0" y="4" width="10" height="1" />
          </svg>
        </button>
        <button
          onClick={toggleMaximize}
          className="h-full px-4 hover:bg-black/5 text-ink-muted hover:text-ink transition-colors flex items-center justify-center"
          tabIndex={-1}
        >
          {isMaximized ? (
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor">
              <rect x="2.5" y="2.5" width="7" height="7" strokeWidth="1" />
              <path d="M0.5 7.5V0.5H7.5" strokeWidth="1" />
            </svg>
          ) : (
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor">
              <rect x="0.5" y="0.5" width="9" height="9" strokeWidth="1" />
            </svg>
          )}
        </button>
        <button
          onClick={close}
          className="h-full px-4 hover:bg-danger hover:text-white text-ink-muted transition-colors flex items-center justify-center"
          tabIndex={-1}
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor">
            <path d="M1 1L9 9M9 1L1 9" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </div>
  );
}
