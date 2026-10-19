import React from 'react';
import { Download, CheckCircle2, X, RefreshCw, AlertCircle } from 'lucide-react';
import { useUpdateStore } from '../stores/updateStore';
import { useTranslation } from '../i18n/i18nContext';
import { Button } from './ui/Button';

export function UpdateProgressBar() {
  const { t } = useTranslation();
  const {
    currentVersion,
    availableUpdate,
    promptDownload,
    downloading,
    progress,
    downloadedBytes,
    totalBytes,
    downloadReady,
    error,
    startDownload,
    applyUpdateAndRestart,
    dismissPrompt,
    cancelDownload,
    reset,
  } = useUpdateStore();

  if (!promptDownload && !downloading && !downloadReady && !error) {
    return null;
  }

  const downloadedMb = (downloadedBytes / (1024 * 1024)).toFixed(1);
  const totalMb = (totalBytes / (1024 * 1024)).toFixed(1);

  return (
    <div
      role="region"
      aria-label={t('updates.title') || 'App update'}
      className="fixed bottom-10 right-4 z-50 w-[380px] max-w-[calc(100vw-32px)] border border-rule-strong bg-paper p-4 shadow-[0_20px_45px_-15px_rgba(10,14,9,0.35)] animate-fade select-none"
    >
      {/* 1. Prompt state */}
      {promptDownload && availableUpdate && !downloading && !downloadReady && (
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-[2px] bg-carbon-tint text-carbon">
                <Download className="h-4 w-4" strokeWidth={2} />
              </span>
              <div>
                <h4 className="text-[13px] font-semibold text-ink">
                  {t('updates.new_version') || 'Доступна новая версия'}
                </h4>
                <p className="num text-[11px] text-ink-soft">
                  v{currentVersion} → <strong className="text-ink">{availableUpdate.tagName}</strong>
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={dismissPrompt}
              aria-label={t('general.close')}
              className="text-ink-faint hover:text-ink p-1"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          <p className="text-[12px] leading-relaxed text-ink-soft">
            {t('updates.prompt_desc') ||
              'Выпущено обновление Kassa POS. Скачать файл во временную папку и обновить?'}
          </p>

          <div className="flex items-center justify-end gap-2 pt-1">
            <Button size="sm" variant="outline" onClick={dismissPrompt}>
              {t('updates.later') || 'Позже'}
            </Button>
            <Button size="sm" onClick={() => void startDownload()}>
              <Download className="h-3.5 w-3.5" />
              {t('updates.download') || 'Скачать обновление'}
            </Button>
          </div>
        </div>
      )}

      {/* 2. Downloading in progress */}
      {downloading && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4 animate-spin text-carbon" strokeWidth={2} />
              <span className="text-[13px] font-semibold text-ink">
                {t('updates.downloading') || 'Загрузка обновления'} {availableUpdate?.tagName}…
              </span>
            </div>
            <button
              type="button"
              onClick={cancelDownload}
              title={t('general.cancel')}
              className="text-ink-faint hover:text-danger text-[11px] underline"
            >
              {t('general.cancel')}
            </button>
          </div>

          {/* Progress bar */}
          <div className="h-2.5 w-full overflow-hidden border border-rule-strong bg-counter">
            <div
              className="h-full bg-carbon transition-all duration-200"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="num flex items-center justify-between text-[11px] text-ink-soft">
            <span>{progress}%</span>
            <span>
              {downloadedMb} MB / {totalMb} MB
            </span>
          </div>
        </div>
      )}

      {/* 3. Ready to install / restart */}
      {downloadReady && (
        <div className="space-y-3">
          <div className="flex items-start gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-[2px] bg-success-tint text-success">
              <CheckCircle2 className="h-4 w-4" strokeWidth={2} />
            </span>
            <div className="flex-1">
              <h4 className="text-[13px] font-semibold text-ink">
                {t('updates.ready_title') || 'Обновление загружено!'}
              </h4>
              <p className="mt-0.5 text-[12px] leading-relaxed text-ink-soft">
                {t('updates.ready_desc') ||
                  `Файл ${availableUpdate?.tagName} готов к установке. Перезапустить приложение сейчас?`}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <Button size="sm" variant="outline" onClick={reset}>
              {t('updates.later') || 'Позже'}
            </Button>
            <Button size="sm" onClick={() => void applyUpdateAndRestart()}>
              <RefreshCw className="h-3.5 w-3.5" />
              {t('updates.restart_now') || 'Перезапустить и обновить'}
            </Button>
          </div>
        </div>
      )}

      {/* 4. Error state */}
      {error && (
        <div className="space-y-2.5">
          <div className="flex items-center gap-2 text-danger">
            <AlertCircle className="h-4 w-4" />
            <span className="text-[12px] font-medium">{error}</span>
          </div>
          <div className="flex justify-end">
            <Button size="sm" variant="outline" onClick={reset}>
              {t('general.close')}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
