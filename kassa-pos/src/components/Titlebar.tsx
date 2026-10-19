import React, { useEffect, useState } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { LockKeyhole, LogOut } from 'lucide-react';
import { useTranslation } from '../i18n/i18nContext';
import { useAuthStore } from '../stores/authStore';
import { isDesktop } from '../lib/desktop';
import { BarcodeMark } from './BarcodeMark';
import { initials } from '../lib/utils';
import { APP_VERSION } from '../lib/version';

interface TitlebarProps {
  showAccount?: boolean;
}

export function Titlebar({ showAccount = false }: TitlebarProps) {
  const { t } = useTranslation();
  const { cashierName, lockScreen, logout } = useAuthStore();
  const [isMaximized, setIsMaximized] = useState(false);
  const desktop = isDesktop();

  useEffect(() => {
    if (!desktop) return;
    let unlisten: (() => void) | undefined;
    const appWindow = getCurrentWindow();

    const sync = async () => {
      try {
        setIsMaximized(await appWindow.isMaximized());
      } catch {
        // Window state is cosmetic; never block the UI on it.
      }
    };

    void sync();
    void appWindow
      .onResized(() => {
        void sync();
      })
      .then((fn) => {
        unlisten = fn;
      })
      .catch(() => undefined);

    return () => unlisten?.();
  }, [desktop]);

  const windowAction = async (action: 'minimize' | 'maximize' | 'close') => {
    if (!desktop) return;
    try {
      const appWindow = getCurrentWindow();
      if (action === 'minimize') await appWindow.minimize();
      else if (action === 'maximize') await appWindow.toggleMaximize();
      else await appWindow.close();
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <header
      className="flex h-9 shrink-0 select-none items-stretch border-b border-rule bg-counter-deep"
    >
      <div
        data-tauri-drag-region
        className="pointer-events-auto flex min-w-0 items-center gap-2.5 px-3.5 select-none"
      >
        <BarcodeMark className="h-3.5 w-9 text-ink pointer-events-none" />
        <span className="text-[13px] font-semibold tracking-tight text-ink pointer-events-none">
          {t('app.name')}
        </span>
        <span className="num rounded-[2px] border border-rule-strong bg-paper px-1.5 py-0.2 text-[10px] font-semibold text-ink-soft pointer-events-none">
          v{APP_VERSION}
        </span>
        {!desktop && (
          <span className="rounded-[2px] border border-rule-strong px-1.5 py-0.5 text-[10px] font-medium text-ink-soft pointer-events-none">
            {t('shell.demo')}
          </span>
        )}
      </div>

      <div data-tauri-drag-region className="flex-1" />

      {showAccount && (
        <div className="no-drag flex items-stretch">
          <div className="flex items-center gap-2 px-3 text-[12px] text-ink-soft">
            <span className="flex h-5 w-5 items-center justify-center rounded-full border border-rule-strong bg-paper text-[9px] font-semibold text-ink">
              {initials(cashierName)}
            </span>
            <span className="max-w-[140px] truncate text-ink">{cashierName}</span>
          </div>
          <button
            type="button"
            onClick={() => void lockScreen()}
            title={t('titlebar.lock')}
            aria-label={t('titlebar.lock')}
            className="flex w-10 items-center justify-center text-ink-soft transition-colors hover:bg-paper hover:text-ink"
          >
            <LockKeyhole className="h-3.5 w-3.5" strokeWidth={1.75} />
          </button>
          <button
            type="button"
            onClick={() => void logout()}
            title={t('titlebar.logout')}
            aria-label={t('titlebar.logout')}
            className="flex w-10 items-center justify-center text-ink-soft transition-colors hover:bg-danger-tint hover:text-danger"
          >
            <LogOut className="h-3.5 w-3.5" strokeWidth={1.75} />
          </button>
        </div>
      )}

      {desktop && (
        <div className="no-drag flex items-stretch border-l border-rule">
          <button
            type="button"
            onClick={() => void windowAction('minimize')}
            aria-label={t('titlebar.minimize')}
            className="flex w-11 items-center justify-center text-ink-soft transition-colors hover:bg-paper hover:text-ink"
          >
            <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
              <rect x="0" y="4.5" width="10" height="1" fill="currentColor" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => void windowAction('maximize')}
            aria-label={isMaximized ? t('titlebar.restore') : t('titlebar.maximize')}
            className="flex w-11 items-center justify-center text-ink-soft transition-colors hover:bg-paper hover:text-ink"
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
            type="button"
            onClick={() => void windowAction('close')}
            aria-label={t('titlebar.close')}
            className="flex w-11 items-center justify-center text-ink-soft transition-colors hover:bg-danger hover:text-white"
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor">
              <path d="M1 1L9 9M9 1L1 9" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      )}
    </header>
  );
}
