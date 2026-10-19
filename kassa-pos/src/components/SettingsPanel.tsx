import React, { useCallback, useEffect, useState } from 'react';
import { LogOut, RefreshCw, Monitor } from 'lucide-react';
import { useTranslation } from '../i18n/i18nContext';
import { useSettingsStore, type Locale } from '../stores/settingsStore';
import { useAuthStore } from '../stores/authStore';
import { useUpdateStore } from '../stores/updateStore';
import { invoke, isDesktop, errorMessage } from '../lib/desktop';
import { resetDemoData } from '../lib/demo';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Switch } from './ui/Switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/Select';
import { ConfirmDialog } from './ui/ConfirmDialog';
import { useToast } from './ui/toast-host';
import { cn } from '../lib/utils';

const LANGUAGES: Array<{ id: Locale; label: string }> = [
  { id: 'ru', label: 'Русский' },
  { id: 'uz-Cyrl', label: 'Ўзбекча' },
  { id: 'uz-Latn', label: 'Oʻzbekcha' },
];

const LOCK_OPTIONS = [0, 1, 5, 10, 15, 30];

export function SettingsPanel() {
  const { t, locale, setLocale } = useTranslation();
  const { toast } = useToast();
  const { requestLogout, logout } = useAuthStore();
  const settings = useSettingsStore();

  const [printers, setPrinters] = useState<string[]>([]);
  const [loadingPrinters, setLoadingPrinters] = useState(false);
  const [prefixes, setPrefixes] = useState(settings.weightedPrefixes);
  const [resetOpen, setResetOpen] = useState(false);
  const [creatingShortcut, setCreatingShortcut] = useState(false);
  const { currentVersion, checking, checkUpdates: runCheckUpdates } = useUpdateStore();

  const handleCreateShortcut = async () => {
    setCreatingShortcut(true);
    try {
      const msg = await invoke<string>('create_desktop_shortcut');
      toast({
        title: 'Ярлык создан',
        description: typeof msg === 'string' ? msg : 'Ярлык Kassa POS успешно добавлен на рабочий стол',
        variant: 'default',
      });
    } catch (err) {
      toast({
        title: 'Не удалось создать ярлык',
        description: errorMessage(err),
        variant: 'destructive',
      });
    } finally {
      setCreatingShortcut(false);
    }
  };

  const saveSetting = (key: string, value: string) => {
    void invoke('update_setting', { key, value }).catch(() => undefined);
  };

  const loadPrinters = useCallback(async (isManual = false) => {
    setLoadingPrinters(true);
    try {
      const list = await invoke<string[]>('list_printers');
      const safeList = Array.isArray(list) ? list : [];
      setPrinters(safeList);
      if (!settings.printerName && safeList[0]) {
        settings.setPrinterName(safeList[0]);
        saveSetting('printer_name', safeList[0]);
      }
      if (isManual) {
        if (safeList.length === 0) {
          toast({
            title: 'Принтеры не обнаружены',
            description: 'Подключите чековый принтер по USB или настройте сетевой принтер',
          });
        } else {
          toast({
            title: 'Список принтеров обновлён',
            description: `Найдено устройств: ${safeList.length}`,
          });
        }
      }
    } catch (error) {
      if (isManual) {
        toast({
          title: t('settings.printer_error'),
          description: errorMessage(error),
          variant: 'destructive',
        });
      }
    } finally {
      setLoadingPrinters(false);
    }
  }, [settings, t, toast]);

  useEffect(() => {
    void loadPrinters(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const changeLanguage = (next: Locale) => {
    setLocale(next);
    saveSetting('language', next);
  };

  const savePrefixes = () => {
    const cleaned = prefixes
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean)
      .join(',');
    settings.setWeightedPrefixes(cleaned);
    setPrefixes(cleaned);
    saveSetting('weighted_prefixes', cleaned);
    toast({ title: t('settings.saved'), variant: 'success' });
  };

  const handleCheckUpdates = async (simulatedVersion?: string) => {
    try {
      const hasUpdate = await runCheckUpdates(false, simulatedVersion);
      if (!hasUpdate) {
        toast({ title: t('settings.up_to_date') });
      }
    } catch (error) {
      toast({
        title: t('settings.update_error'),
        description: errorMessage(error),
        variant: 'destructive',
      });
    }
  };

  const resetDemo = async () => {
    resetDemoData();
    await logout();
    window.location.reload();
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-paper">
      <div className="min-h-0 flex-1 overflow-auto">
        <div className="border-b border-rule px-4 py-3">
          <h2 className="text-[16px] font-semibold tracking-tight text-ink">{t('settings.title')}</h2>
          <p className="mt-0.5 text-[11px] text-ink-soft">{t('settings.subtitle')}</p>
        </div>

        <section className="border-b border-rule px-4 py-3.5">
          <SectionTitle>{t('settings.language')}</SectionTitle>
          <div className="mt-2 grid grid-cols-3 gap-px border border-rule-strong bg-rule">
            {LANGUAGES.map((language) => (
              <button
                key={language.id}
                type="button"
                onClick={() => changeLanguage(language.id)}
                className={cn(
                  'min-h-9 px-1 text-[11px] font-medium transition-colors',
                  locale === language.id
                    ? 'bg-ink text-paper'
                    : 'bg-paper text-ink-soft hover:bg-counter hover:text-ink',
                )}
              >
                {language.label}
              </button>
            ))}
          </div>
        </section>

        <section className="border-b border-rule px-4 py-3.5">
          <SectionTitle>{t('settings.theme')}</SectionTitle>
          <div className="mt-2 grid grid-cols-2 gap-px border border-rule-strong bg-rule">
            {(['light', 'dark'] as const).map((theme) => (
              <button
                key={theme}
                type="button"
                onClick={() => settings.setTheme(theme)}
                className={cn(
                  'min-h-9 text-[12px] font-medium transition-colors',
                  settings.theme === theme
                    ? 'bg-ink text-paper'
                    : 'bg-paper text-ink-soft hover:bg-counter hover:text-ink',
                )}
              >
                {theme === 'light' ? t('settings.light') : t('settings.dark')}
              </button>
            ))}
          </div>
        </section>

        <section className="border-b border-rule px-4 py-3.5">
          <div className="flex items-center justify-between">
            <SectionTitle>{t('settings.printer')}</SectionTitle>
            <button
              type="button"
              onClick={() => void loadPrinters(true)}
              disabled={loadingPrinters}
              aria-label={t('settings.refresh')}
              className="flex h-8 w-8 items-center justify-center text-ink-soft hover:bg-counter hover:text-ink"
            >
              <RefreshCw
                className={cn('h-3.5 w-3.5', loadingPrinters && 'animate-spin')}
                strokeWidth={1.75}
              />
            </button>
          </div>

          <div className="mt-2">
            <Select
              value={settings.printerName || 'none'}
              onValueChange={(value) => {
                const name = value === 'none' ? '' : value;
                settings.setPrinterName(name);
                saveSetting('printer_name', name);
              }}
            >
              <SelectTrigger className="h-9 text-[12px]">
                <SelectValue placeholder={t('settings.no_printer')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{t('settings.no_printer')}</SelectItem>
                {Array.from(new Set([settings.printerName, ...printers].filter(Boolean))).map(
                  (printer) => (
                    <SelectItem key={printer} value={printer}>
                      {printer}
                    </SelectItem>
                  ),
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="mt-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-[12px] text-ink">{t('settings.auto_print')}</p>
              <p className="text-[10px] text-ink-faint">{t('settings.auto_print_hint')}</p>
            </div>
            <Switch
              checked={settings.autoPrint}
              onCheckedChange={(checked) => {
                settings.setAutoPrint(checked);
                saveSetting('auto_print', String(checked));
              }}
              aria-label={t('settings.auto_print')}
            />
          </div>

          <div className="mt-3 flex items-center justify-between gap-3">
            <p className="text-[12px] text-ink">{t('settings.width')}</p>
            <div className="flex border border-rule-strong">
              {([58, 80] as const).map((width) => (
                <button
                  key={width}
                  type="button"
                  onClick={() => {
                    settings.setPrinterWidth(width);
                    saveSetting('printer_width', String(width));
                  }}
                  className={cn(
                    'num min-h-8 w-12 text-[11px] transition-colors',
                    settings.printerWidth === width
                      ? 'bg-ink text-paper'
                      : 'bg-paper text-ink-soft hover:bg-counter',
                  )}
                >
                  {width}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="border-b border-rule px-4 py-3.5">
          <SectionTitle>{t('settings.lock')}</SectionTitle>
          <div className="mt-2">
            <Select
              value={String(settings.lockTime)}
              onValueChange={(value) => {
                const minutes = Number(value);
                settings.setLockTime(minutes);
                saveSetting('lock_timeout', String(minutes));
              }}
            >
              <SelectTrigger className="h-9 text-[12px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LOCK_OPTIONS.map((minutes) => (
                  <SelectItem key={minutes} value={String(minutes)}>
                    {minutes === 0 ? t('settings.never') : t('settings.minutes', { count: minutes })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="mt-1.5 text-[10px] text-ink-faint">{t('settings.lock_hint')}</p>
          </div>

          <div className="mt-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-[12px] text-ink">{t('settings.autostart')}</p>
              <p className="text-[10px] text-ink-faint">Запуск Kassa при старте Windows</p>
            </div>
            <Switch
              checked={settings.autostart}
              onCheckedChange={async (checked) => {
                settings.setAutostart(checked);
                saveSetting('autostart', String(checked));
                try {
                  await invoke('set_windows_autostart', { enabled: checked });
                  toast({
                    title: checked ? 'Автозагрузка включена' : 'Автозагрузка отключена',
                  });
                } catch (err) {
                  console.error('Failed to set autostart in Windows registry', err);
                }
              }}
              aria-label={t('settings.autostart')}
            />
          </div>

          <div className="mt-3.5 flex items-center justify-between gap-3 border-t border-rule/50 pt-3">
            <div>
              <p className="text-[12px] font-medium text-ink">Ярлык на рабочем столе</p>
              <p className="text-[10px] text-ink-faint">Создать ярлык для быстрого запуска</p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => void handleCreateShortcut()}
              disabled={creatingShortcut}
              className="gap-1.5 rounded-lg text-[11px]"
            >
              <Monitor className="h-3.5 w-3.5" strokeWidth={1.75} />
              {creatingShortcut ? t('general.loading') : 'Создать'}
            </Button>
          </div>
        </section>

        <section className="border-b border-rule px-4 py-3.5">
          <SectionTitle>{t('settings.weighted')}</SectionTitle>
          <div className="mt-2 flex gap-2">
            <Input
              aria-label={t('settings.weighted')}
              value={prefixes}
              onChange={(event) => setPrefixes(event.target.value)}
              className="num h-9 text-[12px]"
            />
            <Button size="sm" variant="outline" onClick={savePrefixes} disabled={!prefixes.trim()}>
              {t('general.save')}
            </Button>
          </div>
          <p className="mt-1.5 text-[10px] leading-relaxed text-ink-faint">
            {t('settings.weighted_hint')}
          </p>
        </section>

        <section className="border-b border-rule px-4 py-3.5">
          <div className="flex items-center justify-between">
            <SectionTitle>{t('settings.updates')}</SectionTitle>
            <span className="num rounded-[2px] border border-rule-strong bg-counter px-1.5 py-0.5 text-[10px] font-semibold text-ink-soft">
              v{currentVersion}
            </span>
          </div>
          <p className="mt-1 text-[11px] text-ink-soft">
            {t('settings.current_version')}: <span className="num font-semibold text-ink">v{currentVersion}</span>
          </p>

          <Button
            size="sm"
            variant="outline"
            className="mt-2.5 w-full"
            onClick={() => void handleCheckUpdates()}
            disabled={checking}
          >
            {checking ? t('general.loading') : t('settings.check')}
          </Button>
          <p className="mt-1.5 text-[10px] text-ink-faint">{t('settings.updates_hint')}</p>

          {!isDesktop() && (
            <div className="mt-2.5 pt-2 border-t border-dashed border-rule">
              <Button
                size="sm"
                variant="ghost"
                className="w-full text-[11px] text-carbon hover:bg-carbon-tint"
                onClick={() => void handleCheckUpdates('v1.0.3')}
              >
                Тест: Симулировать v1.0.3
              </Button>
            </div>
          )}
        </section>

        <section className="border-b border-rule px-4 py-3.5">
          <SectionTitle>Тестовые демо-товары</SectionTitle>
          <p className="mt-1 text-[11px] leading-relaxed text-ink-soft">
            Загружает 12 изолированных позиций (хлеб, напитки, сладости, весовые яблоки) для безопасного тестирования чеков без синхронизации с боевым каталогом.
          </p>
          <div className="mt-2.5 flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="flex-1"
              onClick={async () => {
                try {
                  const count = await invoke<number>('load_demo_products');
                  toast({
                    title: 'Демо-товары загружены',
                    description: `Добавлено товаров: ${count}. Весовой штрихкод: 2700001012503`,
                    variant: 'success',
                  });
                } catch (err) {
                  toast({
                    title: 'Ошибка',
                    description: errorMessage(err),
                    variant: 'destructive',
                  });
                }
              }}
            >
              Загрузить товары
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-danger hover:bg-danger-tint hover:text-danger"
              onClick={async () => {
                try {
                  const count = await invoke<number>('clear_demo_products');
                  toast({
                    title: 'Демо-товары очищены',
                    description: `Удалено записей: ${count}`,
                  });
                } catch (err) {
                  toast({
                    title: 'Ошибка',
                    description: errorMessage(err),
                    variant: 'destructive',
                  });
                }
              }}
            >
              Очистить
            </Button>
          </div>
        </section>

        {!isDesktop() && (
          <section className="border-b border-rule px-4 py-3.5">
            <SectionTitle>{t('settings.demo')}</SectionTitle>
            <p className="mt-1.5 text-[11px] leading-relaxed text-ink-soft">{t('settings.demo_hint')}</p>
            <Button
              size="sm"
              variant="dangerGhost"
              className="mt-2"
              onClick={() => setResetOpen(true)}
            >
              {t('settings.reset')}
            </Button>
          </section>
        )}
      </div>

      <div className="shrink-0 border-t border-rule px-4 py-3">
        <Button variant="outline" className="w-full justify-start rounded-lg" onClick={() => requestLogout()}>
          <LogOut className="h-3.5 w-3.5" strokeWidth={1.75} />
          {t('settings.logout')}
        </Button>
      </div>

      <ConfirmDialog
        open={resetOpen}
        title={t('settings.reset')}
        description={t('settings.demo_hint')}
        confirmLabel={t('settings.reset')}
        cancelLabel={t('general.cancel')}
        destructive
        onConfirm={() => void resetDemo()}
        onClose={() => setResetOpen(false)}
      />
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-[12px] font-medium text-ink-soft">{children}</h3>;
}
