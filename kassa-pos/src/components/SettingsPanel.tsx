import React from 'react';
import { useTranslation } from '../i18n/i18nContext';
import { useSettingsStore } from '../stores/settingsStore';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/Select';
import { Input } from './ui/Input';
import { Button } from './ui/Button';

export function SettingsPanel() {
  const { t, setLocale } = useTranslation();
  const { language, autoPrint, lockTime, setLanguage, setAutoPrint, setLockTime } = useSettingsStore();

  return (
    <div className="flex flex-col h-full bg-surface p-6 space-y-8 overflow-auto">
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-ink">{t('settings.language')}</h3>
        <Select value={language} onValueChange={(v) => { setLanguage(v); setLocale(v as any); }}>
          <SelectTrigger>
            <SelectValue placeholder="Выберите язык" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ru">Русский</SelectItem>
            <SelectItem value="uz-Cyrl">Кириллица ўзб</SelectItem>
            <SelectItem value="uz-Latn">Lotin o'zb</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-medium text-ink">{t('settings.printer')}</h3>
        <Select defaultValue="none">
          <SelectTrigger>
            <SelectValue placeholder="Выберите принтер" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Не выбран</SelectItem>
            <SelectItem value="printer1">POS-80C (USB)</SelectItem>
          </SelectContent>
        </Select>
        
        <div className="flex items-center justify-between">
          <span className="text-sm text-ink">{t('settings.auto_print')}</span>
          <input 
            type="checkbox" 
            checked={autoPrint} 
            onChange={(e) => setAutoPrint(e.target.checked)}
            className="w-4 h-4 rounded border-border"
          />
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-medium text-ink">{t('settings.lock_time')}</h3>
        <Select value={lockTime.toString()} onValueChange={(v) => setLockTime(parseInt(v, 10))}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="0">Никогда</SelectItem>
            <SelectItem value="1">1 минута</SelectItem>
            <SelectItem value="5">5 минут</SelectItem>
            <SelectItem value="15">15 минут</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-medium text-ink">{t('settings.scale_prefixes')}</h3>
        <Input placeholder="Например: 21, 22" />
      </div>

      <div className="mt-auto pt-8">
        <Button variant="outline" className="w-full">{t('settings.check_updates')}</Button>
      </div>
    </div>
  );
}
