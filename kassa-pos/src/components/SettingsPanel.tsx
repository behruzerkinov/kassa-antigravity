import { useEffect, useState } from 'react';
import { useTranslation } from '../i18n/i18nContext';
import { useSettingsStore } from '../stores/settingsStore';
import { useProductStore } from '../stores/productStore';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/Select';
import { Input } from './ui/Input';
import { Button } from './ui/Button';
import { PrinterDialog } from './PrinterDialog';
import { QuickSellManager } from './QuickSellManager';

export function SettingsPanel() {
  const { t, setLocale } = useTranslation();
  const { language, autoPrint, lockTime, printerName, setAutoPrint, setLockTime } = useSettingsStore();
  const { quickSell, loadQuickSell } = useProductStore();
  const [printerOpen, setPrinterOpen] = useState(false);
  const [quickSellOpen, setQuickSellOpen] = useState(false);

  useEffect(() => { loadQuickSell().catch(() => {}); }, [loadQuickSell]);

  return (
    <div className="flex flex-col h-full bg-surface p-6 space-y-8 overflow-auto">
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-ink">{t('settings.language')}</h3>
        <Select value={language} onValueChange={(v) => setLocale(v as 'ru' | 'uz-Cyrl' | 'uz-Latn')}>
          <SelectTrigger data-testid="language-select">
            <SelectValue placeholder={t('settings.select_language')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ru">Русский</SelectItem>
            <SelectItem value="uz-Cyrl">Ўзбекча (кирилл)</SelectItem>
            <SelectItem value="uz-Latn">O'zbekcha (lotin)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-medium text-ink">{t('settings.printer')}</h3>
        <Button variant="outline" className="w-full h-12 justify-between" onClick={() => setPrinterOpen(true)}>
          <span className="truncate">{printerName || t('printing.none')}</span>
          <span className="text-ink-muted">›</span>
        </Button>
        <div className="flex items-center justify-between">
          <span className="text-sm text-ink">{t('settings.auto_print')}</span>
          <input
            type="checkbox"
            checked={autoPrint}
            onChange={(e) => setAutoPrint(e.target.checked)}
            className="w-5 h-5 rounded border-border"
          />
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-medium text-ink">{t('quick_sell.title')}</h3>
        <Button variant="outline" className="w-full h-12 justify-between" onClick={() => setQuickSellOpen(true)}>
          <span>{t('quick_sell.configure')}</span>
          <span className="text-ink-muted tabular-nums">{quickSell.length}</span>
        </Button>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-medium text-ink">{t('settings.lock_time')}</h3>
        <Select value={lockTime.toString()} onValueChange={(v) => setLockTime(parseInt(v, 10))}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="0">{t('settings.never')}</SelectItem>
            {[1, 5, 15].map((m) => (
              <SelectItem key={m} value={String(m)}>{t('settings.minutes').replace('{n}', String(m))}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-medium text-ink">{t('settings.scale_prefixes')}</h3>
        <Input placeholder={t('settings.scale_prefixes_placeholder')} />
      </div>

      <div className="mt-auto pt-8">
        <Button variant="outline" className="w-full">{t('settings.check_updates')}</Button>
      </div>

      {printerOpen && <PrinterDialog onClose={() => setPrinterOpen(false)} />}
      {quickSellOpen && <QuickSellManager onClose={() => setQuickSellOpen(false)} />}
    </div>
  );
}
