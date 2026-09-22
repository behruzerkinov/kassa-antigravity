import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../stores/authStore';
import { useSyncStore } from '../stores/syncStore';
import { useTranslation } from '../i18n/i18nContext';

export function StatusBar() {
  const { openSmena } = useAuthStore();
  const { pendingCount } = useSyncStore();
  const { t } = useTranslation();
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 10000);
    return () => clearInterval(timer);
  }, []);

  const timeString = time.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="h-[28px] bg-surface-raised border-t border-border flex items-center justify-between px-4 text-xs text-ink-muted select-none">
      <div className="flex items-center gap-4">
        {pendingCount > 0 ? (
          <span className="flex items-center gap-1 text-warning">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            {t('sync.pending')}: {pendingCount}
          </span>
        ) : (
          <span>Синхронизировано</span>
        )}
      </div>

      <div className="flex items-center gap-2">
        <span>{openSmena ? t('smena.is_open') : 'Смена закрыта'}</span>
      </div>

      <div className="tabular-nums font-medium">
        {timeString}
      </div>
    </div>
  );
}
