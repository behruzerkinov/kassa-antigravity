import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../stores/authStore';
import { useTranslation } from '../i18n/i18nContext';

export function StatusBar() {
  const { openSmena } = useAuthStore();
  const { t } = useTranslation();
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 10000);
    return () => clearInterval(timer);
  }, []);

  const timeString = time.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="h-[28px] bg-surface-raised border-t border-border flex items-center justify-between px-4 text-xs text-ink-muted select-none">
      <div className="flex items-center gap-4" />

      <div className="flex items-center gap-2">
        <span>{openSmena ? t('smena.is_open') : 'Смена закрыта'}</span>
      </div>

      <div className="tabular-nums font-medium">
        {timeString}
      </div>
    </div>
  );
}
