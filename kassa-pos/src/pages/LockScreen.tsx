import React, { useState } from 'react';
import { useAuthStore } from '../stores/authStore';
import { useTranslation } from '../i18n/i18nContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Titlebar } from '../components/Titlebar';
import { BarcodeMark } from '../components/BarcodeMark';
import { initials } from '../lib/utils';
import { errorMessage } from '../lib/desktop';
import { APP_VERSION } from '../lib/version';

export function LockScreen() {
  const { unlockScreen, cashierName, openSmena } = useAuthStore();
  const { t } = useTranslation();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      await unlockScreen(password);
    } catch (err) {
      setError(errorMessage(err) || t('lock.invalid'));
      setPassword('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen flex-col bg-counter">
      <Titlebar />
      <div className="paper-grid relative flex flex-1 items-center justify-center overflow-hidden px-6">
        <div className="pointer-events-none absolute inset-0 bg-counter/70" aria-hidden="true" />

        <main className="relative w-full max-w-[360px] border border-rule-strong bg-paper px-7 pb-7 pt-8 text-center shadow-[0_40px_90px_-50px_rgba(10,14,9,0.5)]">
          <BarcodeMark className="mx-auto h-4 w-16 text-ink-faint" />

          <div className="mx-auto mt-5 flex h-12 w-12 items-center justify-center rounded-full border border-rule-strong bg-counter text-[14px] font-semibold text-ink">
            {initials(cashierName)}
          </div>
          <p className="mt-2 text-[13px] font-medium text-ink">{cashierName}</p>
          <h1 className="mt-3 text-[22px] font-semibold leading-tight tracking-tight text-ink">
            {t('lock.locked')}
          </h1>
          <p className="mt-1.5 text-[12px] leading-relaxed text-ink-soft">{t('lock.hint')}</p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-3 text-left">
            <Input
              type="password"
              label={t('login.password')}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoFocus
              autoComplete="current-password"
              disabled={loading}
              error={error}
            />
            <Button type="submit" size="lg" className="w-full" disabled={loading || !password}>
              {loading ? t('general.loading') : t('lock.unlock')}
            </Button>
          </form>

          {openSmena && (
            <p className="mt-5 border-t border-rule pt-3 text-[11px] text-ink-faint">
              {t('lock.shift_running')}
            </p>
          )}

          <p className="mt-3 text-center num text-[10px] text-ink-faint">
            v{APP_VERSION}
          </p>
        </main>
      </div>
    </div>
  );
}
