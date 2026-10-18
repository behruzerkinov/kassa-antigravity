import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useTranslation, errorMessage } from '../i18n/i18nContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/Dialog';
import { Button } from './ui/Button';
import { Spinner } from './ui/Spinner';
import { useSettingsStore } from '../stores/settingsStore';
import { toast } from '../stores/toastStore';
import { cn } from '../lib/utils';

// Kept for the app session so reopening the dialog does not re-query the OS.
let cachedPrinters: string[] | null = null;

export function PrinterDialog({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const { printerName, setPrinterName } = useSettingsStore();
  const [printers, setPrinters] = useState<string[] | null>(cachedPrinters);
  const [loading, setLoading] = useState(false);

  const refresh = async () => {
    setLoading(true);
    try {
      const list = await invoke<string[]>('list_printers');
      cachedPrinters = list;
      setPrinters(list);
    } catch (e) {
      toast(errorMessage(e), 'error');
    } finally {
      setLoading(false);
    }
  };

  const silentReady = printers !== null && !!printerName && printers.includes(printerName);

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('settings.printer')}</DialogTitle>
        </DialogHeader>
        <Button variant="outline" className="h-12 mt-2 gap-2" onClick={refresh} disabled={loading} data-testid="printer-refresh">
          {loading && <Spinner />}
          {loading ? t('printing.refreshing') : t('printing.refresh')}
        </Button>
        {printers !== null && (
          <div className={cn('text-sm rounded-md p-2', silentReady ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger')} data-testid="silent-print-status">
            {silentReady ? t('printing.silent_ready').replace('{name}', printerName) : printerName ? t('printing.missing_desc').replace('{name}', printerName) : t('printing.select_default')}
          </div>
        )}
        <div className="max-h-72 overflow-auto border border-border rounded-md">
          {printers === null ? (
            <div className="p-3 text-sm text-ink-muted">{t('printing.press_refresh')}</div>
          ) : printers.length === 0 ? (
            <div className="p-3 text-sm text-ink-muted">{t('printing.no_printers')}</div>
          ) : (
            printers.map((p) => (
              <button
                key={p}
                className={cn('w-full text-left px-3 min-h-12 border-b border-border last:border-0 hover:bg-surface-raised', p === printerName && 'bg-accent text-white hover:bg-accent')}
                onClick={() => { setPrinterName(p); toast(t('printing.saved').replace('{name}', p), 'success'); }}
              >
                {p}
              </button>
            ))
          )}
        </div>
        <Button variant="outline" className="h-12" onClick={onClose}>{t('general.close')}</Button>
      </DialogContent>
    </Dialog>
  );
}
