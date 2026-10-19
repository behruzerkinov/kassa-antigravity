import React, { useState } from 'react';
import { useAuthStore } from '../stores/authStore';
import { useTranslation } from '../i18n/i18nContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Titlebar } from '../components/Titlebar';
import { BarcodeMark } from '../components/BarcodeMark';
import { isDesktop, errorMessage, invoke } from '../lib/desktop';
import { APP_VERSION } from '../lib/version';

export function LoginPage() {
  const { login } = useAuthStore();
  const { t } = useTranslation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isBootstrap, setIsBootstrap] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    let mounted = true;
    void invoke<boolean>('has_cashiers')
      .then((has) => {
        if (mounted && !has) {
          setIsBootstrap(true);
        }
      })
      .catch(() => undefined);
    return () => {
      mounted = false;
    };
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');

    if (isBootstrap) {
      if (password !== confirmPassword) {
        setError(t('login.password_mismatch'));
        return;
      }
      if (password.length < 4) {
        setError(t('login.password_short'));
        return;
      }
      setLoading(true);
      try {
        const res = await invoke<{
          token: string;
          cashier_id: number;
          cashier_name: string;
          open_smena: null;
        }>('bootstrap_cashier', { username: username.trim(), password });

        useAuthStore.setState({
          token: res.token,
          cashierId: res.cashier_id,
          cashierName: res.cashier_name,
          isAuthenticated: true,
          isLocked: false,
          openSmena: null,
        });
      } catch (err) {
        setError(errorMessage(err));
      } finally {
        setLoading(false);
      }
      return;
    }

    setLoading(true);
    try {
      await login(username.trim(), password);
    } catch (err) {
      setError(errorMessage(err) || t('login.invalid'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen flex-col bg-counter">
      <Titlebar />
      <div className="paper-grid relative flex flex-1 items-center justify-center overflow-hidden px-6">
        <div className="pointer-events-none absolute inset-0 bg-counter/55" aria-hidden="true" />

        <main className="relative w-full max-w-[420px] border border-rule-strong bg-paper px-8 pb-8 pt-9 shadow-[0_40px_90px_-50px_rgba(10,14,9,0.5)]">
          <BarcodeMark className="h-5 w-24 text-ink" />
          <h1 className="mt-4 text-[32px] font-semibold leading-none tracking-tighter text-ink">
            {isBootstrap ? t('login.bootstrap_title') : t('app.name')}
          </h1>
          <p className="mt-2 text-[13px] text-ink-soft">
            {isBootstrap ? t('login.bootstrap_subtitle') : t('login.subtitle')}
          </p>

          <form onSubmit={handleSubmit} className="mt-7 space-y-4">
            <Input
              label={t('login.username')}
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              autoComplete="username"
              autoFocus
              disabled={loading}
            />
            <Input
              type="password"
              label={t('login.password')}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete={isBootstrap ? 'new-password' : 'current-password'}
              disabled={loading}
            />

            {isBootstrap && (
              <Input
                type="password"
                label={t('login.confirm_password')}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                autoComplete="new-password"
                disabled={loading}
              />
            )}

            {error && (
              <div
                role="alert"
                className="border-l-2 border-danger bg-danger-tint px-3 py-2 text-[12px] leading-relaxed text-danger"
              >
                {error}
              </div>
            )}

            <Button
              type="submit"
              size="lg"
              className="w-full"
              disabled={loading || !username || !password || (isBootstrap && !confirmPassword)}
            >
              {loading
                ? t('general.loading')
                : isBootstrap
                  ? t('login.bootstrap_submit')
                  : t('login.submit')}
            </Button>
          </form>

          {!isDesktop() && !isBootstrap && (
            <div className="mt-5 border border-dashed border-rule-strong px-3 py-2.5">
              <p className="text-[11px] leading-relaxed text-ink-soft">{t('login.demo_hint')}</p>
            </div>
          )}
        </main>

        <p className="absolute bottom-5 left-0 right-0 flex items-center justify-center gap-2 text-[11px] text-ink-faint">
          <span className="h-1.5 w-1.5 rounded-full bg-success" aria-hidden="true" />
          <span>{t('login.offline')}</span>
          <span className="opacity-50">·</span>
          <span className="num font-mono">v{APP_VERSION}</span>
        </p>
      </div>
    </div>
  );
}
