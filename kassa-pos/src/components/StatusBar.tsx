import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../stores/authStore';
import { useSyncStore } from '../stores/syncStore';
import { useTranslation } from '../i18n/i18nContext';
import { formatTime } from '../lib/utils';
import { cn } from '../lib/utils';
import { APP_VERSION } from '../lib/version';

export function StatusBar({ onShiftClick }: { onShiftClick: () => void }) {
  const { openSmena } = useAuthStore();
  const { pendingCount, isSyncing, refresh, retry } = useSyncStore();
  const { t } = useTranslation();
  const [time, setTime] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setTime(new Date()), 10_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const isPending = pendingCount > 0;

  return (
    <footer className="flex h-8 shrink-0 select-none items-stretch border-t border-rule bg-counter-deep text-[11px] text-ink-soft">
      <div className="flex min-w-0 flex-1 items-center gap-2 px-3.5">
        <span
          className={cn(
            'h-1.5 w-1.5 rounded-full',
            isPending ? 'bg-warning' : isSyncing ? 'bg-carbon' : 'bg-success',
          )}
          aria-hidden="true"
        />
        {isPending ? (
          <button
            type="button"
            onClick={() => void retry().then(() => refresh()).catch(() => undefined)}
            className="truncate font-medium text-warning underline-offset-2 hover:underline"
            title={t('status.retry_hint')}
          >
            {t('status.pending', { count: pendingCount })}
          </button>
        ) : (
          <span>{isSyncing ? t('status.syncing') : t('status.synced')}</span>
        )}
      </div>

      <button
        type="button"
        onClick={onShiftClick}
        className="flex items-center gap-2 border-l border-rule px-3.5 text-[11px] transition-colors hover:bg-paper hover:text-ink"
      >
        <span
          className={cn(
            'h-1.5 w-1.5 rounded-full',
            openSmena ? 'bg-success' : 'bg-ink-faint',
          )}
          aria-hidden="true"
        />
        {openSmena
          ? t('status.shift_open', { time: formatTime(openSmena.opened_at) })
          : t('status.shift_closed')}
      </button>

      <div className="num flex items-center border-l border-rule px-3 text-[10px] text-ink-faint select-none">
        v{APP_VERSION}
      </div>

      <div className="num flex min-w-[74px] items-center justify-end border-l border-rule px-3.5 text-ink">
        {time.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
      </div>
    </footer>
  );
}
